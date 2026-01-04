// User Account Management Service
// Manages user account status, disabling, and account controls

export type AccountStatus = 'active' | 'disabled' | 'suspended' | 'banned' | 'pending';

export interface UserAccount {
  userId: string;
  username: string;
  email: string;
  status: AccountStatus;
  createdAt: Date;
  disabledAt?: Date;
  disabledBy?: string; // admin ID
  disabledReason?: string;
  reEnabledAt?: Date;
  lastLogin?: Date;
  loginAttempts: number;
  maxLoginAttempts: number;
  isLockedOut: boolean;
  lockedUntil?: Date;
  metadata: {
    points: number;
    level: number;
    joinDate: Date;
    lastActivityDate: Date;
  };
}

export interface AccountAuditLog {
  id: string;
  userId: string;
  action: 'created' | 'disabled' | 'enabled' | 'suspended' | 'banned' | 'login' | 'logout';
  performedBy: string; // admin ID or userId
  reason?: string;
  timestamp: Date;
  details: Record<string, any>;
}

export class UserAccountService {
  private userAccounts: Map<string, UserAccount> = new Map();
  private auditLogs: AccountAuditLog[] = [];

  constructor() {
    // Initialize service
  }

  // ============================================
  // ACCOUNT CREATION & INITIALIZATION
  // ============================================

  /**
   * Create new user account
   */
  createUserAccount(
    userId: string,
    username: string,
    email: string
  ): UserAccount {
    if (this.userAccounts.has(userId)) {
      throw new Error(`User account ${userId} already exists`);
    }

    const account: UserAccount = {
      userId,
      username,
      email,
      status: 'active',
      createdAt: new Date(),
      loginAttempts: 0,
      maxLoginAttempts: 5,
      isLockedOut: false,
      metadata: {
        points: 0,
        level: 1,
        joinDate: new Date(),
        lastActivityDate: new Date(),
      },
    };

    this.userAccounts.set(userId, account);
    this.logAuditEvent('created', userId, userId, 'Account created', {});

    return account;
  }

  /**
   * Get user account
   */
  getUserAccount(userId: string): UserAccount | null {
    return this.userAccounts.get(userId) || null;
  }

  /**
   * Get all user accounts
   */
  getAllUserAccounts(): UserAccount[] {
    return Array.from(this.userAccounts.values());
  }

  // ============================================
  // ACCOUNT STATUS MANAGEMENT
  // ============================================

  /**
   * Disable user account temporarily
   */
  disableUserAccount(
    userId: string,
    adminId: string,
    reason: string = 'Admin action'
  ): UserAccount | null {
    const account = this.userAccounts.get(userId);
    if (!account) {
      throw new Error(`User account ${userId} not found`);
    }

    if (account.status === 'disabled') {
      throw new Error(`Account ${userId} is already disabled`);
    }

    account.status = 'disabled';
    account.disabledAt = new Date();
    account.disabledBy = adminId;
    account.disabledReason = reason;

    this.logAuditEvent('disabled', userId, adminId, reason, {
      previousStatus: 'active',
      newStatus: 'disabled',
    });

    return account;
  }

  /**
   * Enable user account
   */
  enableUserAccount(
    userId: string,
    adminId: string,
    reason: string = 'Admin action'
  ): UserAccount | null {
    const account = this.userAccounts.get(userId);
    if (!account) {
      throw new Error(`User account ${userId} not found`);
    }

    if (account.status === 'active') {
      throw new Error(`Account ${userId} is already active`);
    }

    account.status = 'active';
    account.reEnabledAt = new Date();
    account.isLockedOut = false;
    account.loginAttempts = 0;

    this.logAuditEvent('enabled', userId, adminId, reason, {
      previousStatus: account.status,
      newStatus: 'active',
    });

    return account;
  }

  /**
   * Suspend user account
   */
  suspendUserAccount(
    userId: string,
    adminId: string,
    reason: string,
    suspensionDays: number = 7
  ): UserAccount | null {
    const account = this.userAccounts.get(userId);
    if (!account) {
      throw new Error(`User account ${userId} not found`);
    }

    account.status = 'suspended';
    account.disabledAt = new Date();
    account.disabledBy = adminId;
    account.disabledReason = reason;
    account.lockedUntil = new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000);

    this.logAuditEvent('suspended', userId, adminId, reason, {
      suspensionDays,
      lockedUntil: account.lockedUntil,
    });

    return account;
  }

  /**
   * Ban user account
   */
  banUserAccount(
    userId: string,
    adminId: string,
    reason: string
  ): UserAccount | null {
    const account = this.userAccounts.get(userId);
    if (!account) {
      throw new Error(`User account ${userId} not found`);
    }

    account.status = 'banned';
    account.disabledAt = new Date();
    account.disabledBy = adminId;
    account.disabledReason = reason;

    this.logAuditEvent('banned', userId, adminId, reason, {
      permanent: true,
    });

    return account;
  }

  /**
   * Check if account is disabled
   */
  isAccountDisabled(userId: string): boolean {
    const account = this.userAccounts.get(userId);
    return account ? account.status !== 'active' && account.status !== 'pending' : false;
  }

  /**
   * Check if account is active
   */
  isAccountActive(userId: string): boolean {
    const account = this.userAccounts.get(userId);
    return account ? account.status === 'active' : false;
  }

  // ============================================
  // LOGIN & LOCKOUT MANAGEMENT
  // ============================================

  /**
   * Record login attempt
   */
  recordLoginAttempt(userId: string, success: boolean): boolean {
    const account = this.userAccounts.get(userId);
    if (!account) return false;

    if (success) {
      account.loginAttempts = 0;
      account.isLockedOut = false;
      account.lastLogin = new Date();
      account.metadata.lastActivityDate = new Date();
      this.logAuditEvent('login', userId, userId, 'Successful login', {});
      return true;
    } else {
      account.loginAttempts += 1;

      if (account.loginAttempts >= account.maxLoginAttempts) {
        account.isLockedOut = true;
        account.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        this.logAuditEvent('logout', userId, userId, 'Account locked due to failed login attempts', {
          attempts: account.loginAttempts,
        });
      }

      return false;
    }
  }

  /**
   * Unlock account
   */
  unlockAccount(userId: string): UserAccount | null {
    const account = this.userAccounts.get(userId);
    if (!account) return null;

    account.isLockedOut = false;
    account.loginAttempts = 0;
    account.lockedUntil = undefined;

    this.logAuditEvent('login', userId, userId, 'Account unlocked', {});

    return account;
  }

  /**
   * Check if account is locked out
   */
  isAccountLockedOut(userId: string): boolean {
    const account = this.userAccounts.get(userId);
    if (!account || !account.isLockedOut) return false;

    if (account.lockedUntil && account.lockedUntil < new Date()) {
      account.isLockedOut = false;
      account.loginAttempts = 0;
      return false;
    }

    return account.isLockedOut;
  }

  // ============================================
  // USER POINTS & LEVEL MANAGEMENT
  // ============================================

  /**
   * Add points to user
   */
  addPoints(userId: string, points: number, reason: string): UserAccount | null {
    const account = this.userAccounts.get(userId);
    if (!account) return null;

    account.metadata.points += points;
    account.metadata.level = Math.floor(account.metadata.points / 100) + 1;

    return account;
  }

  /**
   * Remove points from user
   */
  removePoints(userId: string, points: number, reason: string): UserAccount | null {
    const account = this.userAccounts.get(userId);
    if (!account) return null;

    account.metadata.points = Math.max(0, account.metadata.points - points);
    account.metadata.level = Math.floor(account.metadata.points / 100) + 1;

    return account;
  }

  /**
   * Get user points
   */
  getUserPoints(userId: string): number {
    const account = this.userAccounts.get(userId);
    return account?.metadata.points || 0;
  }

  /**
   * Get user level
   */
  getUserLevel(userId: string): number {
    const account = this.userAccounts.get(userId);
    return account?.metadata.level || 1;
  }

  // ============================================
  // AUDIT LOGGING
  // ============================================

  /**
   * Log audit event
   */
  private logAuditEvent(
    action: AccountAuditLog['action'],
    userId: string,
    performedBy: string,
    reason: string,
    details: Record<string, any>
  ): void {
    const log: AccountAuditLog = {
      id: `audit-${Date.now()}-${Math.random()}`,
      userId,
      action,
      performedBy,
      reason,
      timestamp: new Date(),
      details,
    };

    this.auditLogs.push(log);
  }

  /**
   * Get user audit logs
   */
  getUserAuditLogs(userId: string): AccountAuditLog[] {
    return this.auditLogs.filter((log) => log.userId === userId);
  }

  /**
   * Get all audit logs
   */
  getAllAuditLogs(): AccountAuditLog[] {
    return this.auditLogs;
  }

  /**
   * Get audit logs by action
   */
  getAuditLogsByAction(action: AccountAuditLog['action']): AccountAuditLog[] {
    return this.auditLogs.filter((log) => log.action === action);
  }

  // ============================================
  // STATISTICS & REPORTING
  // ============================================

  /**
   * Get account statistics
   */
  getAccountStatistics(): {
    totalAccounts: number;
    activeAccounts: number;
    disabledAccounts: number;
    suspendedAccounts: number;
    bannedAccounts: number;
    lockedOutAccounts: number;
    totalPoints: number;
    averageLevel: number;
  } {
    const accounts = Array.from(this.userAccounts.values());

    return {
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter((a) => a.status === 'active').length,
      disabledAccounts: accounts.filter((a) => a.status === 'disabled').length,
      suspendedAccounts: accounts.filter((a) => a.status === 'suspended').length,
      bannedAccounts: accounts.filter((a) => a.status === 'banned').length,
      lockedOutAccounts: accounts.filter((a) => a.isLockedOut).length,
      totalPoints: accounts.reduce((sum, a) => sum + a.metadata.points, 0),
      averageLevel: accounts.length > 0
        ? accounts.reduce((sum, a) => sum + a.metadata.level, 0) / accounts.length
        : 0,
    };
  }

  /**
   * Get disabled accounts
   */
  getDisabledAccounts(): UserAccount[] {
    return Array.from(this.userAccounts.values()).filter((a) => a.status === 'disabled');
  }

  /**
   * Get suspended accounts
   */
  getSuspendedAccounts(): UserAccount[] {
    return Array.from(this.userAccounts.values()).filter((a) => a.status === 'suspended');
  }

  /**
   * Get banned accounts
   */
  getBannedAccounts(): UserAccount[] {
    return Array.from(this.userAccounts.values()).filter((a) => a.status === 'banned');
  }

  /**
   * Export account data
   */
  exportAccountData(userId: string): string {
    const account = this.userAccounts.get(userId);
    if (!account) return '';

    const logs = this.getUserAuditLogs(userId);
    const data = {
      account,
      auditLogs: logs,
      exportedAt: new Date(),
    };

    return JSON.stringify(data, null, 2);
  }
}

// Singleton instance
export const userAccountService = new UserAccountService();
