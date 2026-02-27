import pygame

SCREEN_WIDTH = 1200
SCREEN_HEIGHT = 800
GRID_SIZE = 10
FPS = 15

TRON_COLORS = {
    'background': (0, 0, 0),
    'grid': (0, 40, 60),
    'player_colors': [
        (0, 255, 255),      # Cyan (classic TRON)
        (255, 100, 0),      # Orange
        (255, 0, 255),      # Magenta
        (0, 255, 0),        # Green
        (255, 255, 0),      # Yellow
        (255, 0, 0),        # Red
        (128, 0, 255),      # Purple
        (0, 128, 255),      # Light Blue
        (255, 128, 0),      # Gold
        (0, 255, 128),      # Mint
        (255, 255, 255),    # White
    ],
    'text': (0, 255, 255),
    'ui': (0, 200, 255),
    'glow': (100, 200, 255),
}

SERVER_HOST = '0.0.0.0'
SERVER_PORT = 5555
BUFFER_SIZE = 4096

INITIAL_CYCLE_LENGTH = 3
CYCLE_SPEED = 1

GAME_MODES = {
    'TIME': 'time',
    'LIVES': 'lives'
}

DEFAULT_TIME_LIMIT = 300
DEFAULT_LIVES = 3

MAP_SIZES = {
    2: (60, 40),
    4: (80, 60),
    6: (100, 70),
    8: (120, 80),
    10: (140, 90),
    11: (150, 100),
}
