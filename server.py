# DEPRECATED: This Python TCP server is deprecated in favor of the WebSocket server in web-server.js
# Use: npm start (Node.js WebSocket server) instead of python server.py
# 
# Legacy TCP socket server - kept for reference only
# The new WebSocket server provides:
# - Auto-stop capability for Fly.io cost savings
# - Zoom integration compatibility  
# - Better web browser support
# - Single unified server architecture

import socket
import threading
import json
import time
from game_state import GameState
from constants import SERVER_HOST, SERVER_PORT, BUFFER_SIZE, FPS

class GameServer:
    def __init__(self):
        self.server_socket = None
        self.clients = {}
        self.game_state = None
        self.running = False
        self.game_thread = None
        self.lobby_ready = {}
        self.num_players = 2
        self.game_mode = 'time'
        self.time_limit = 300
        
    def start(self):
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server_socket.bind((SERVER_HOST, SERVER_PORT))
        self.server_socket.listen(11)
        self.running = True
        
        print(f"[SERVER] Started on {SERVER_HOST}:{SERVER_PORT}")
        print(f"[SERVER] Waiting for {self.num_players} players to join...")
        
        accept_thread = threading.Thread(target=self.accept_connections)
        accept_thread.daemon = True
        accept_thread.start()
        
        try:
            while self.running:
                time.sleep(0.1)
        except KeyboardInterrupt:
            print("\n[SERVER] Shutting down...")
            self.stop()
    
    def accept_connections(self):
        while self.running:
            try:
                client_socket, address = self.server_socket.accept()
                print(f"[SERVER] Connection from {address}")
                
                client_thread = threading.Thread(
                    target=self.handle_client,
                    args=(client_socket, address)
                )
                client_thread.daemon = True
                client_thread.start()
            except:
                break
    
    def handle_client(self, client_socket, address):
        player_id = None
        try:
            data = client_socket.recv(BUFFER_SIZE).decode('utf-8')
            message = json.loads(data)
            
            if message['type'] == 'join':
                player_name = message['name']
                player_id = f"player_{len(self.clients)}"
                
                if self.game_state is None:
                    self.game_state = GameState(self.num_players, self.game_mode, self.time_limit)
                
                if self.game_state.add_player(player_id, player_name):
                    self.clients[player_id] = client_socket
                    self.lobby_ready[player_id] = False
                    
                    response = {
                        'type': 'join_success',
                        'player_id': player_id,
                        'num_players': self.num_players,
                        'game_mode': self.game_mode
                    }
                    client_socket.send(json.dumps(response).encode('utf-8'))
                    
                    print(f"[SERVER] {player_name} joined as {player_id} ({len(self.clients)}/{self.num_players})")
                    
                    self.broadcast_lobby_update()
                    
                    if len(self.clients) == self.num_players:
                        print("[SERVER] All players connected! Waiting for ready signals...")
                else:
                    response = {'type': 'join_failed', 'reason': 'Game full'}
                    client_socket.send(json.dumps(response).encode('utf-8'))
                    client_socket.close()
                    return
            
            while self.running:
                data = client_socket.recv(BUFFER_SIZE).decode('utf-8')
                if not data:
                    break
                
                message = json.loads(data)
                
                if message['type'] == 'ready':
                    self.lobby_ready[player_id] = True
                    print(f"[SERVER] {player_id} is ready")
                    self.broadcast_lobby_update()
                    
                    if all(self.lobby_ready.values()) and len(self.lobby_ready) == self.num_players:
                        print("[SERVER] All players ready! Starting game...")
                        self.start_game()
                
                elif message['type'] == 'input':
                    if self.game_state and self.game_state.game_started:
                        direction = message['direction']
                        self.game_state.handle_input(player_id, direction)
                
                elif message['type'] == 'config':
                    if not self.game_state or not self.game_state.game_started:
                        self.num_players = message.get('num_players', self.num_players)
                        self.game_mode = message.get('game_mode', self.game_mode)
                        self.time_limit = message.get('time_limit', self.time_limit)
                        self.game_state = GameState(self.num_players, self.game_mode, self.time_limit)
                        print(f"[SERVER] Config updated: {self.num_players} players, {self.game_mode} mode")
                        self.broadcast_lobby_update()
                        
        except Exception as e:
            print(f"[SERVER] Error with client {address}: {e}")
        finally:
            if player_id and player_id in self.clients:
                del self.clients[player_id]
                if player_id in self.lobby_ready:
                    del self.lobby_ready[player_id]
                if self.game_state:
                    self.game_state.remove_player(player_id)
                print(f"[SERVER] {player_id} disconnected")
                self.broadcast_lobby_update()
            try:
                client_socket.close()
            except:
                pass
    
    def broadcast_lobby_update(self):
        lobby_data = {
            'type': 'lobby_update',
            'players': len(self.clients),
            'max_players': self.num_players,
            'ready_count': sum(self.lobby_ready.values()),
            'game_mode': self.game_mode
        }
        self.broadcast(lobby_data)
    
    def start_game(self):
        if self.game_state:
            self.game_state.start_game()
            self.game_thread = threading.Thread(target=self.game_loop)
            self.game_thread.daemon = True
            self.game_thread.start()
    
    def game_loop(self):
        clock_tick = 1.0 / FPS
        
        while self.running and self.game_state and not self.game_state.game_over:
            start_time = time.time()
            
            self.game_state.update()
            
            game_data = {
                'type': 'game_update',
                'state': self.game_state.to_dict()
            }
            self.broadcast(game_data)
            
            elapsed = time.time() - start_time
            sleep_time = max(0, clock_tick - elapsed)
            time.sleep(sleep_time)
        
        if self.game_state and self.game_state.game_over:
            print(f"[SERVER] Game over! Winner: {self.game_state.winner.name if self.game_state.winner else 'None'}")
    
    def broadcast(self, data):
        message = json.dumps(data).encode('utf-8')
        dead_clients = []
        
        for player_id, client_socket in self.clients.items():
            try:
                client_socket.send(message)
            except:
                dead_clients.append(player_id)
        
        for player_id in dead_clients:
            if player_id in self.clients:
                del self.clients[player_id]
    
    def stop(self):
        self.running = False
        if self.server_socket:
            self.server_socket.close()
        for client_socket in self.clients.values():
            try:
                client_socket.close()
            except:
                pass

if __name__ == '__main__':
    server = GameServer()
    server.start()
