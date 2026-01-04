// UI Theme Service
// Manages application themes, dark mode, light mode, and custom user themes

export type ThemeMode = 'light' | 'dark' | 'system' | 'custom';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  destructive: string;
}

export interface Theme {
  id: string;
  name: string;
  mode: ThemeMode;
  colors: ThemeColors;
  isDefault: boolean;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserThemePreferences {
  userId: string;
  currentThemeId: string;
  autoSwitchOnSchedule: boolean;
  lightModeStartTime?: string; // HH:MM format
  darkModeStartTime?: string; // HH:MM format
  savedThemes: Theme[];
}

// Default Light Theme
const DEFAULT_LIGHT_THEME: Theme = {
  id: 'light-default',
  name: 'Light Mode',
  mode: 'light',
  colors: {
    primary: '#0066cc',
    secondary: '#6c757d',
    accent: '#ff6b6b',
    background: '#ffffff',
    foreground: '#000000',
    muted: '#f0f0f0',
    mutedForeground: '#666666',
    border: '#e0e0e0',
    destructive: '#dc3545',
  },
  isDefault: true,
  isCustom: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Default Dark Theme
const DEFAULT_DARK_THEME: Theme = {
  id: 'dark-default',
  name: 'Dark Mode',
  mode: 'dark',
  colors: {
    primary: '#3b82f6',
    secondary: '#9ca3af',
    accent: '#ef4444',
    background: '#1f2937',
    foreground: '#f3f4f6',
    muted: '#374151',
    mutedForeground: '#d1d5db',
    border: '#4b5563',
    destructive: '#ef5350',
  },
  isDefault: true,
  isCustom: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Popular Custom Themes
const PRESET_THEMES: Theme[] = [
  {
    id: 'nord',
    name: 'Nord',
    mode: 'dark',
    colors: {
      primary: '#88c0d0',
      secondary: '#81a1c1',
      accent: '#bf616a',
      background: '#2e3440',
      foreground: '#eceff4',
      muted: '#3b4252',
      mutedForeground: '#d8dee9',
      border: '#434c5e',
      destructive: '#bf616a',
    },
    isDefault: false,
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dracula',
    name: 'Dracula',
    mode: 'dark',
    colors: {
      primary: '#8be9fd',
      secondary: '#6272a4',
      accent: '#ff79c6',
      background: '#282a36',
      foreground: '#f8f8f2',
      muted: '#44475a',
      mutedForeground: '#f8f8f2',
      border: '#6272a4',
      destructive: '#ff5555',
    },
    isDefault: false,
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    mode: 'dark',
    colors: {
      primary: '#268bd2',
      secondary: '#859900',
      accent: '#dc322f',
      background: '#002b36',
      foreground: '#fdf6e3',
      muted: '#073642',
      mutedForeground: '#93a1a1',
      border: '#586e75',
      destructive: '#dc322f',
    },
    isDefault: false,
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    mode: 'light',
    colors: {
      primary: '#268bd2',
      secondary: '#859900',
      accent: '#dc322f',
      background: '#fdf6e3',
      foreground: '#002b36',
      muted: '#eee8d5',
      mutedForeground: '#657b83',
      border: '#93a1a1',
      destructive: '#dc322f',
    },
    isDefault: false,
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'one-dark',
    name: 'One Dark',
    mode: 'dark',
    colors: {
      primary: '#61afef',
      secondary: '#56b6c2',
      accent: '#c678dd',
      background: '#282c34',
      foreground: '#abb2bf',
      muted: '#3e4451',
      mutedForeground: '#5c6370',
      border: '#4b5263',
      destructive: '#e06c75',
    },
    isDefault: false,
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'gruvbox-dark',
    name: 'Gruvbox Dark',
    mode: 'dark',
    colors: {
      primary: '#83a598',
      secondary: '#8ec07c',
      accent: '#fa4933',
      background: '#282828',
      foreground: '#ebdbb2',
      muted: '#3c3836',
      mutedForeground: '#bdae93',
      border: '#504945',
      destructive: '#fb4934',
    },
    isDefault: false,
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export class UIThemeService {
  private userThemePreferences: Map<string, UserThemePreferences> = new Map();
  private availableThemes: Map<string, Theme> = new Map();

  constructor() {
    // Initialize with default themes
    this.availableThemes.set('light-default', DEFAULT_LIGHT_THEME);
    this.availableThemes.set('dark-default', DEFAULT_DARK_THEME);

    // Add preset themes
    PRESET_THEMES.forEach((theme) => {
      this.availableThemes.set(theme.id, theme);
    });
  }

  // ============================================
  // THEME MANAGEMENT
  // ============================================

  /**
   * Get all available themes
   */
  getAllThemes(): Theme[] {
    return Array.from(this.availableThemes.values());
  }

  /**
   * Get theme by ID
   */
  getTheme(themeId: string): Theme | null {
    return this.availableThemes.get(themeId) || null;
  }

  /**
   * Get default light theme
   */
  getDefaultLightTheme(): Theme {
    return DEFAULT_LIGHT_THEME;
  }

  /**
   * Get default dark theme
   */
  getDefaultDarkTheme(): Theme {
    return DEFAULT_DARK_THEME;
  }

  /**
   * Get all preset themes
   */
  getPresetThemes(): Theme[] {
    return PRESET_THEMES;
  }

  // ============================================
  // USER THEME PREFERENCES
  // ============================================

  /**
   * Initialize user theme preferences
   */
  initializeUserTheme(userId: string, initialThemeId: string = 'light-default'): UserThemePreferences {
    if (this.userThemePreferences.has(userId)) {
      return this.userThemePreferences.get(userId)!;
    }

    const preferences: UserThemePreferences = {
      userId,
      currentThemeId: initialThemeId,
      autoSwitchOnSchedule: false,
      savedThemes: [DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME, ...PRESET_THEMES],
    };

    this.userThemePreferences.set(userId, preferences);
    return preferences;
  }

  /**
   * Get user theme preferences
   */
  getUserThemePreferences(userId: string): UserThemePreferences | null {
    return this.userThemePreferences.get(userId) || null;
  }

  /**
   * Set current theme for user
   */
  setUserTheme(userId: string, themeId: string): boolean {
    const preferences = this.initializeUserTheme(userId);

    if (!this.availableThemes.has(themeId) && !preferences.savedThemes.find((t) => t.id === themeId)) {
      return false;
    }

    preferences.currentThemeId = themeId;
    return true;
  }

  /**
   * Get current theme for user
   */
  getCurrentUserTheme(userId: string): Theme | null {
    const preferences = this.initializeUserTheme(userId);
    const themeId = preferences.currentThemeId;

    return this.availableThemes.get(themeId) || preferences.savedThemes.find((t) => t.id === themeId) || null;
  }

  // ============================================
  // CUSTOM THEME CREATION
  // ============================================

  /**
   * Create custom theme
   */
  createCustomTheme(userId: string, name: string, mode: ThemeMode, colors: Partial<ThemeColors>): Theme {
    // Merge with default theme colors
    const defaultColors = mode === 'dark' ? DEFAULT_DARK_THEME.colors : DEFAULT_LIGHT_THEME.colors;

    const mergedColors: ThemeColors = {
      ...defaultColors,
      ...colors,
    };

    const theme: Theme = {
      id: `custom-${userId}-${Date.now()}`,
      name,
      mode,
      colors: mergedColors,
      isDefault: false,
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to user's saved themes
    const preferences = this.initializeUserTheme(userId);
    preferences.savedThemes.push(theme);

    // Also add to global available themes
    this.availableThemes.set(theme.id, theme);

    return theme;
  }

  /**
   * Update custom theme
   */
  updateCustomTheme(userId: string, themeId: string, updates: Partial<Theme>): Theme | null {
    const preferences = this.userThemePreferences.get(userId);
    if (!preferences) return null;

    const themeIndex = preferences.savedThemes.findIndex((t) => t.id === themeId);
    if (themeIndex === -1) return null;

    const theme = preferences.savedThemes[themeIndex];
    if (!theme.isCustom) return null; // Can't update non-custom themes

    const updated: Theme = {
      ...theme,
      ...updates,
      id: theme.id,
      isCustom: true,
      updatedAt: new Date(),
    };

    preferences.savedThemes[themeIndex] = updated;
    this.availableThemes.set(themeId, updated);

    return updated;
  }

  /**
   * Delete custom theme
   */
  deleteCustomTheme(userId: string, themeId: string): boolean {
    const preferences = this.userThemePreferences.get(userId);
    if (!preferences) return false;

    const themeIndex = preferences.savedThemes.findIndex((t) => t.id === themeId);
    if (themeIndex === -1) return false;

    const theme = preferences.savedThemes[themeIndex];
    if (!theme.isCustom) return false; // Can't delete default themes

    preferences.savedThemes.splice(themeIndex, 1);
    this.availableThemes.delete(themeId);

    // If this was the current theme, switch to default
    if (preferences.currentThemeId === themeId) {
      preferences.currentThemeId = 'light-default';
    }

    return true;
  }

  /**
   * Get user's saved themes
   */
  getUserSavedThemes(userId: string): Theme[] {
    const preferences = this.initializeUserTheme(userId);
    return preferences.savedThemes;
  }

  // ============================================
  // SCHEDULED THEME SWITCHING
  // ============================================

  /**
   * Enable auto theme switching based on time
   */
  enableScheduledThemeSwitching(
    userId: string,
    lightModeStartTime: string,
    darkModeStartTime: string
  ): UserThemePreferences | null {
    const preferences = this.userThemePreferences.get(userId);
    if (!preferences) return null;

    preferences.autoSwitchOnSchedule = true;
    preferences.lightModeStartTime = lightModeStartTime;
    preferences.darkModeStartTime = darkModeStartTime;

    return preferences;
  }

  /**
   * Disable auto theme switching
   */
  disableScheduledThemeSwitching(userId: string): UserThemePreferences | null {
    const preferences = this.userThemePreferences.get(userId);
    if (!preferences) return null;

    preferences.autoSwitchOnSchedule = false;
    return preferences;
  }

  /**
   * Get current theme based on schedule
   */
  getScheduledTheme(userId: string): Theme | null {
    const preferences = this.userThemePreferences.get(userId);
    if (!preferences || !preferences.autoSwitchOnSchedule) return null;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const lightStart = preferences.lightModeStartTime || '06:00';
    const darkStart = preferences.darkModeStartTime || '18:00';

    if (currentTime >= lightStart && currentTime < darkStart) {
      const lightTheme = this.availableThemes.get('light-default');
      return lightTheme || null;
    } else {
      const darkTheme = this.availableThemes.get('dark-default');
      return darkTheme || null;
    }
  }

  // ============================================
  // THEME UTILITIES
  // ============================================

  /**
   * Export theme as JSON
   */
  exportTheme(themeId: string): string {
    const theme = this.availableThemes.get(themeId);
    if (!theme) return '';

    return JSON.stringify(theme, null, 2);
  }

  /**
   * Import theme from JSON
   */
  importTheme(userId: string, themeJSON: string): Theme | null {
    try {
      const theme: Theme = JSON.parse(themeJSON);

      // Validate theme object
      if (
        !theme.name ||
        !theme.mode ||
        !theme.colors ||
        !theme.colors.primary ||
        !theme.colors.background
      ) {
        return null;
      }

      const newTheme: Theme = {
        ...theme,
        id: `imported-${userId}-${Date.now()}`,
        isCustom: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const preferences = this.initializeUserTheme(userId);
      preferences.savedThemes.push(newTheme);
      this.availableThemes.set(newTheme.id, newTheme);

      return newTheme;
    } catch (error) {
      console.error('Error importing theme:', error);
      return null;
    }
  }

  /**
   * Get contrasting text color for background
   */
  getContrastTextColor(backgroundColor: string): string {
    // Simple luminance calculation
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  /**
   * Generate CSS variables from theme
   */
  generateThemeCSS(theme: Theme): string {
    const cssVariables = Object.entries(theme.colors)
      .map(([key, value]) => `--theme-${key}: ${value};`)
      .join('\n  ');

    return `:root {\n  ${cssVariables}\n}`;
  }

  /**
   * Apply theme to DOM
   */
  applyThemeToDOM(theme: Theme): void {
    Object.entries(theme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--theme-${key}`, value);
    });

    // Add theme class to body
    document.body.setAttribute('data-theme', theme.id);
    document.body.setAttribute('data-theme-mode', theme.mode);
  }
}

// Singleton instance
export const uiThemeService = new UIThemeService();
