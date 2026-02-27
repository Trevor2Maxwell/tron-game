import pygame
import socket
import threading
import json
import sys
from constants import *

class TronClient:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("TRON Light Cycles")
        self.clock = pygame.time.Clock()
        self.font = pygame.font.Font(None, 36)
        self.small_font = pygame.font.Font(None, 24)
        
        self.socket = None
        self.player_id = None
        self.game_state = None
        self.running = True
        self.connected = False
        
        self.state = 'menu'
        self.server_ip = '127.0.0.1'
        self.player_name = ''
        self.num_players = 2
        self.game_mode = 'time'
        self.time_limit = 300
        self.input_active = False
        self.input_field = 'name'
        
        self.lobby_info = {
            'players': 0,
            'max_players': 2,
            'ready_count': 0
        }
        
    def connect_to_server(self):
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.server_ip, SERVER_PORT))
            
            join_message = {
                'type': 'join',
                'name': self.player_name
            }
            self.socket.send(json.dumps(join_message).encode('utf-8'))
            
            data = self.socket.recv(BUFFER_SIZE).decode('utf-8')
            response = json.loads(data)
            
            if response['type'] == 'join_success':
                self.player_id = response['player_id']
                self.connected = True
                self.state = 'lobby'
                
                receive_thread = threading.Thread(target=self.receive_data)
                receive_thread.daemon = True
                receive_thread.start()
                
                return True
            else:
                print(f"Failed to join: {response.get('reason', 'Unknown error')}")
                return False
        except Exception as e:
            print(f"Connection error: {e}")
            return False
    
    def receive_data(self):
        while self.running and self.connected:
            try:
                data = self.socket.recv(BUFFER_SIZE).decode('utf-8')
                if not data:
                    break
                
                message = json.loads(data)
                
                if message['type'] == 'lobby_update':
                    self.lobby_info = message
                    
                elif message['type'] == 'game_update':
                    self.game_state = message['state']
                    if self.game_state['game_started'] and self.state == 'lobby':
                        self.state = 'game'
                    if self.game_state['game_over']:
                        self.state = 'game_over'
                        
            except Exception as e:
                print(f"Receive error: {e}")
                break
        
        self.connected = False
    
    def send_input(self, direction):
        if self.connected:
            try:
                message = {
                    'type': 'input',
                    'direction': direction
                }
                self.socket.send(json.dumps(message).encode('utf-8'))
            except:
                pass
    
    def send_ready(self):
        if self.connected:
            try:
                message = {'type': 'ready'}
                self.socket.send(json.dumps(message).encode('utf-8'))
            except:
                pass
    
    def send_config(self):
        if self.connected:
            try:
                message = {
                    'type': 'config',
                    'num_players': self.num_players,
                    'game_mode': self.game_mode,
                    'time_limit': self.time_limit
                }
                self.socket.send(json.dumps(message).encode('utf-8'))
            except:
                pass
    
    def draw_grid(self, grid_width, grid_height):
        for x in range(0, SCREEN_WIDTH, GRID_SIZE * 2):
            pygame.draw.line(self.screen, TRON_COLORS['grid'], (x, 0), (x, SCREEN_HEIGHT), 1)
        for y in range(0, SCREEN_HEIGHT, GRID_SIZE * 2):
            pygame.draw.line(self.screen, TRON_COLORS['grid'], (0, y), (SCREEN_WIDTH, y), 1)
    
    def draw_menu(self):
        self.screen.fill(TRON_COLORS['background'])
        self.draw_grid(100, 100)
        
        title = self.font.render("TRON LIGHT CYCLES", True, TRON_COLORS['text'])
        title_rect = title.get_rect(center=(SCREEN_WIDTH // 2, 100))
        self.screen.blit(title, title_rect)
        
        y_offset = 200
        
        name_label = self.small_font.render("Player Name:", True, TRON_COLORS['ui'])
        self.screen.blit(name_label, (300, y_offset))
        name_color = TRON_COLORS['text'] if self.input_field == 'name' else TRON_COLORS['ui']
        name_box = pygame.Rect(500, y_offset - 5, 300, 35)
        pygame.draw.rect(self.screen, name_color, name_box, 2)
        name_text = self.small_font.render(self.player_name, True, TRON_COLORS['text'])
        self.screen.blit(name_text, (510, y_offset))
        y_offset += 60
        
        ip_label = self.small_font.render("Server IP:", True, TRON_COLORS['ui'])
        self.screen.blit(ip_label, (300, y_offset))
        ip_color = TRON_COLORS['text'] if self.input_field == 'ip' else TRON_COLORS['ui']
        ip_box = pygame.Rect(500, y_offset - 5, 300, 35)
        pygame.draw.rect(self.screen, ip_color, ip_box, 2)
        ip_text = self.small_font.render(self.server_ip, True, TRON_COLORS['text'])
        self.screen.blit(ip_text, (510, y_offset))
        y_offset += 60
        
        players_label = self.small_font.render(f"Number of Players: {self.num_players}", True, TRON_COLORS['ui'])
        self.screen.blit(players_label, (300, y_offset))
        y_offset += 40
        
        mode_label = self.small_font.render(f"Game Mode: {self.game_mode.upper()}", True, TRON_COLORS['ui'])
        self.screen.blit(mode_label, (300, y_offset))
        y_offset += 40
        
        if self.game_mode == 'time':
            time_label = self.small_font.render(f"Time Limit: {self.time_limit}s", True, TRON_COLORS['ui'])
            self.screen.blit(time_label, (300, y_offset))
            y_offset += 40
        
        instructions = [
            "Press UP/DOWN to change number of players (2-11)",
            "Press M to toggle game mode (TIME/LIVES)",
            "Press T to adjust time limit (if TIME mode)",
            "Press ENTER to connect",
            "Press TAB to switch input fields"
        ]
        
        y_offset += 40
        for instruction in instructions:
            inst_text = self.small_font.render(instruction, True, TRON_COLORS['glow'])
            self.screen.blit(inst_text, (200, y_offset))
            y_offset += 30
    
    def draw_lobby(self):
        self.screen.fill(TRON_COLORS['background'])
        self.draw_grid(100, 100)
        
        title = self.font.render("WAITING FOR PLAYERS", True, TRON_COLORS['text'])
        title_rect = title.get_rect(center=(SCREEN_WIDTH // 2, 150))
        self.screen.blit(title, title_rect)
        
        player_count = self.small_font.render(
            f"Players: {self.lobby_info['players']}/{self.lobby_info['max_players']}",
            True, TRON_COLORS['ui']
        )
        self.screen.blit(player_count, (SCREEN_WIDTH // 2 - 100, 250))
        
        ready_count = self.small_font.render(
            f"Ready: {self.lobby_info['ready_count']}/{self.lobby_info['max_players']}",
            True, TRON_COLORS['ui']
        )
        self.screen.blit(ready_count, (SCREEN_WIDTH // 2 - 100, 300))
        
        mode_text = self.small_font.render(
            f"Mode: {self.lobby_info.get('game_mode', 'time').upper()}",
            True, TRON_COLORS['ui']
        )
        self.screen.blit(mode_text, (SCREEN_WIDTH // 2 - 100, 350))
        
        ready_prompt = self.font.render("Press SPACE when ready", True, TRON_COLORS['glow'])
        ready_rect = ready_prompt.get_rect(center=(SCREEN_WIDTH // 2, 500))
        self.screen.blit(ready_prompt, ready_rect)
    
    def draw_game(self):
        if not self.game_state:
            return
        
        self.screen.fill(TRON_COLORS['background'])
        
        grid_width = self.game_state['grid_width']
        grid_height = self.game_state['grid_height']
        
        cell_width = SCREEN_WIDTH // grid_width
        cell_height = (SCREEN_HEIGHT - 100) // grid_height
        cell_size = min(cell_width, cell_height)
        
        offset_x = (SCREEN_WIDTH - grid_width * cell_size) // 2
        offset_y = (SCREEN_HEIGHT - 100 - grid_height * cell_size) // 2
        
        for x in range(0, grid_width * cell_size + 1, cell_size * 2):
            pygame.draw.line(
                self.screen, TRON_COLORS['grid'],
                (offset_x + x, offset_y),
                (offset_x + x, offset_y + grid_height * cell_size),
                1
            )
        for y in range(0, grid_height * cell_size + 1, cell_size * 2):
            pygame.draw.line(
                self.screen, TRON_COLORS['grid'],
                (offset_x, offset_y + y),
                (offset_x + grid_width * cell_size, offset_y + y),
                1
            )
        
        for cycle_data in self.game_state['cycles'].values():
            color = tuple(cycle_data['color'])
            trail = cycle_data['trail']
            
            for i, (x, y) in enumerate(trail):
                screen_x = offset_x + x * cell_size
                screen_y = offset_y + y * cell_size
                
                alpha = min(255, 100 + (i / len(trail)) * 155) if len(trail) > 0 else 255
                
                pygame.draw.rect(
                    self.screen, color,
                    (screen_x, screen_y, cell_size, cell_size)
                )
                
                if i == len(trail) - 1:
                    glow_rect = pygame.Rect(
                        screen_x - cell_size // 2,
                        screen_y - cell_size // 2,
                        cell_size * 2,
                        cell_size * 2
                    )
                    pygame.draw.rect(self.screen, color, glow_rect, 2)
        
        y_offset = SCREEN_HEIGHT - 80
        sorted_cycles = sorted(
            self.game_state['cycles'].values(),
            key=lambda c: c['score'],
            reverse=True
        )
        
        for i, cycle in enumerate(sorted_cycles[:5]):
            color = tuple(cycle['color'])
            if self.game_state['game_mode'] == 'lives':
                score_text = f"{cycle['name']}: Lives {cycle['lives']}"
            else:
                score_text = f"{cycle['name']}: {cycle['score']}"
            
            text = self.small_font.render(score_text, True, color)
            self.screen.blit(text, (20 + i * 220, y_offset))
        
        if self.game_state['game_mode'] == 'time':
            time_remaining = int(self.game_state.get('time_remaining', 0))
            time_text = self.font.render(f"Time: {time_remaining}s", True, TRON_COLORS['text'])
            time_rect = time_text.get_rect(center=(SCREEN_WIDTH // 2, 30))
            self.screen.blit(time_text, time_rect)
    
    def draw_game_over(self):
        self.screen.fill(TRON_COLORS['background'])
        self.draw_grid(100, 100)
        
        title = self.font.render("GAME OVER", True, TRON_COLORS['text'])
        title_rect = title.get_rect(center=(SCREEN_WIDTH // 2, 200))
        self.screen.blit(title, title_rect)
        
        if self.game_state and self.game_state.get('winner'):
            winner = self.game_state['winner']
            winner_text = self.font.render(
                f"Winner: {winner['name']}",
                True, tuple(winner['color'])
            )
            winner_rect = winner_text.get_rect(center=(SCREEN_WIDTH // 2, 300))
            self.screen.blit(winner_text, winner_rect)
        
        restart_text = self.small_font.render("Press ESC to return to menu", True, TRON_COLORS['ui'])
        restart_rect = restart_text.get_rect(center=(SCREEN_WIDTH // 2, 500))
        self.screen.blit(restart_text, restart_rect)
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            
            elif event.type == pygame.KEYDOWN:
                if self.state == 'menu':
                    if event.key == pygame.K_RETURN:
                        if self.player_name:
                            self.connect_to_server()
                    elif event.key == pygame.K_TAB:
                        self.input_field = 'ip' if self.input_field == 'name' else 'name'
                    elif event.key == pygame.K_BACKSPACE:
                        if self.input_field == 'name':
                            self.player_name = self.player_name[:-1]
                        elif self.input_field == 'ip':
                            self.server_ip = self.server_ip[:-1]
                    elif event.key == pygame.K_UP:
                        self.num_players = min(11, self.num_players + 1)
                    elif event.key == pygame.K_DOWN:
                        self.num_players = max(2, self.num_players - 1)
                    elif event.key == pygame.K_m:
                        self.game_mode = 'lives' if self.game_mode == 'time' else 'time'
                    elif event.key == pygame.K_t and self.game_mode == 'time':
                        self.time_limit = (self.time_limit + 60) % 600
                        if self.time_limit == 0:
                            self.time_limit = 60
                    elif event.unicode and event.unicode.isprintable():
                        if self.input_field == 'name' and len(self.player_name) < 15:
                            self.player_name += event.unicode
                        elif self.input_field == 'ip' and len(self.server_ip) < 20:
                            self.server_ip += event.unicode
                
                elif self.state == 'lobby':
                    if event.key == pygame.K_SPACE:
                        self.send_ready()
                
                elif self.state == 'game':
                    if event.key == pygame.K_w:
                        self.send_input('UP')
                    elif event.key == pygame.K_s:
                        self.send_input('DOWN')
                    elif event.key == pygame.K_a:
                        self.send_input('LEFT')
                    elif event.key == pygame.K_d:
                        self.send_input('RIGHT')
                
                elif self.state == 'game_over':
                    if event.key == pygame.K_ESCAPE:
                        self.state = 'menu'
                        self.connected = False
                        if self.socket:
                            self.socket.close()
    
    def run(self):
        while self.running:
            self.handle_events()
            
            if self.state == 'menu':
                self.draw_menu()
            elif self.state == 'lobby':
                self.draw_lobby()
            elif self.state == 'game':
                self.draw_game()
            elif self.state == 'game_over':
                self.draw_game_over()
            
            pygame.display.flip()
            self.clock.tick(FPS)
        
        if self.socket:
            self.socket.close()
        pygame.quit()
        sys.exit()

if __name__ == '__main__':
    client = TronClient()
    client.run()
