import random
from constants import INITIAL_CYCLE_LENGTH

class LightCycle:
    def __init__(self, player_id, name, color, grid_width, grid_height):
        self.player_id = player_id
        self.name = name
        self.color = color
        self.grid_width = grid_width
        self.grid_height = grid_height
        self.reset_position()
        self.score = 0
        self.lives = 3
        self.alive = True
        
    def reset_position(self):
        self.x = random.randint(10, self.grid_width - 10)
        self.y = random.randint(10, self.grid_height - 10)
        self.direction = random.choice(['UP', 'DOWN', 'LEFT', 'RIGHT'])
        self.trail = [(self.x, self.y)]
        self.length = INITIAL_CYCLE_LENGTH
        
    def change_direction(self, new_direction):
        opposite_directions = {
            'UP': 'DOWN',
            'DOWN': 'UP',
            'LEFT': 'RIGHT',
            'RIGHT': 'LEFT'
        }
        if new_direction != opposite_directions.get(self.direction):
            self.direction = new_direction
            
    def move(self):
        if not self.alive:
            return
            
        if self.direction == 'UP':
            self.y -= 1
        elif self.direction == 'DOWN':
            self.y += 1
        elif self.direction == 'LEFT':
            self.x -= 1
        elif self.direction == 'RIGHT':
            self.x += 1
            
        self.trail.append((self.x, self.y))
        
    def check_wall_collision(self):
        return (self.x < 0 or self.x >= self.grid_width or 
                self.y < 0 or self.y >= self.grid_height)
    
    def check_trail_collision(self, all_trails):
        current_pos = (self.x, self.y)
        for trail in all_trails:
            if current_pos in trail[:-1]:
                return True
        return False
    
    def respawn(self, all_trails):
        max_attempts = 100
        for _ in range(max_attempts):
            test_x = random.randint(10, self.grid_width - 10)
            test_y = random.randint(10, self.grid_height - 10)
            safe = True
            for trail in all_trails:
                if any(abs(test_x - tx) < 5 and abs(test_y - ty) < 5 for tx, ty in trail):
                    safe = False
                    break
            if safe:
                self.x = test_x
                self.y = test_y
                self.direction = random.choice(['UP', 'DOWN', 'LEFT', 'RIGHT'])
                self.trail = [(self.x, self.y)]
                self.alive = True
                return True
        return False
    
    def to_dict(self):
        return {
            'player_id': self.player_id,
            'name': self.name,
            'color': self.color,
            'x': self.x,
            'y': self.y,
            'direction': self.direction,
            'trail': self.trail,
            'score': self.score,
            'lives': self.lives,
            'alive': self.alive
        }
    
    @staticmethod
    def from_dict(data, grid_width, grid_height):
        cycle = LightCycle(data['player_id'], data['name'], data['color'], grid_width, grid_height)
        cycle.x = data['x']
        cycle.y = data['y']
        cycle.direction = data['direction']
        cycle.trail = [tuple(pos) for pos in data['trail']]
        cycle.score = data['score']
        cycle.lives = data['lives']
        cycle.alive = data['alive']
        return cycle
