import time
from lightcycle import LightCycle
from constants import TRON_COLORS, MAP_SIZES, GAME_MODES, DEFAULT_TIME_LIMIT, DEFAULT_LIVES

class GameState:
    def __init__(self, num_players, game_mode='time', time_limit=DEFAULT_TIME_LIMIT):
        self.num_players = num_players
        self.game_mode = game_mode
        self.time_limit = time_limit
        self.grid_width, self.grid_height = MAP_SIZES.get(num_players, (100, 70))
        self.cycles = {}
        self.game_started = False
        self.game_over = False
        self.start_time = None
        self.winner = None
        
    def add_player(self, player_id, name):
        if len(self.cycles) >= self.num_players:
            return False
        color = TRON_COLORS['player_colors'][len(self.cycles) % len(TRON_COLORS['player_colors'])]
        cycle = LightCycle(player_id, name, color, self.grid_width, self.grid_height)
        if self.game_mode == 'lives':
            cycle.lives = DEFAULT_LIVES
        self.cycles[player_id] = cycle
        return True
    
    def remove_player(self, player_id):
        if player_id in self.cycles:
            del self.cycles[player_id]
    
    def start_game(self):
        self.game_started = True
        self.start_time = time.time()
    
    def update(self):
        if not self.game_started or self.game_over:
            return
        
        for cycle in self.cycles.values():
            if cycle.alive:
                cycle.move()
        
        all_trails = [cycle.trail for cycle in self.cycles.values()]
        
        for cycle in self.cycles.values():
            if not cycle.alive:
                continue
                
            if cycle.check_wall_collision():
                self.handle_collision(cycle, all_trails)
            elif cycle.check_trail_collision(all_trails):
                self.handle_collision(cycle, all_trails)
        
        if self.game_mode == 'time':
            elapsed = time.time() - self.start_time
            if elapsed >= self.time_limit:
                self.end_game()
        elif self.game_mode == 'lives':
            alive_players = [c for c in self.cycles.values() if c.lives > 0]
            if len(alive_players) <= 1:
                self.end_game()
    
    def handle_collision(self, cycle, all_trails):
        cycle.alive = False
        if self.game_mode == 'lives':
            cycle.lives -= 1
            if cycle.lives > 0:
                cycle.respawn(all_trails)
        else:
            cycle.respawn(all_trails)
    
    def end_game(self):
        self.game_over = True
        if self.game_mode == 'time':
            self.winner = max(self.cycles.values(), key=lambda c: c.score)
        else:
            alive = [c for c in self.cycles.values() if c.lives > 0]
            self.winner = alive[0] if alive else max(self.cycles.values(), key=lambda c: c.score)
    
    def handle_input(self, player_id, direction):
        if player_id in self.cycles:
            self.cycles[player_id].change_direction(direction)
    
    def get_time_remaining(self):
        if not self.game_started or self.game_mode != 'time':
            return 0
        elapsed = time.time() - self.start_time
        return max(0, self.time_limit - elapsed)
    
    def to_dict(self):
        return {
            'num_players': self.num_players,
            'game_mode': self.game_mode,
            'time_limit': self.time_limit,
            'grid_width': self.grid_width,
            'grid_height': self.grid_height,
            'cycles': {pid: cycle.to_dict() for pid, cycle in self.cycles.items()},
            'game_started': self.game_started,
            'game_over': self.game_over,
            'time_remaining': self.get_time_remaining(),
            'winner': self.winner.to_dict() if self.winner else None
        }
