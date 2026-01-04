// Referral System Service
// Manages user referrals, codes, and rewards

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  totalReferred: number;
  totalRewardsEarned: number;
}

export interface ReferralLink {
  id: string;
  referrerId: string;
  referredUserId: string;
  referralCode: string;
  referredAt: Date;
  status: 'pending' | 'completed' | 'cancelled';
  pointsAwarded: number;
}

export interface UserReferralStats {
  userId: string;
  referralCode: string;
  totalReferred: number;
  activeReferrals: number;
  totalPointsEarned: number;
  referredBy?: string; // userId of the person who referred this user
  referredByCode?: string; // code that was used to refer this user
  joinedViaReferral: boolean;
}

export interface ReferralReward {
  id: string;
  userId: string;
  referrerId: string;
  amount: number; // points
  reason: string;
  awardedAt: Date;
  referralId: string;
}

export const REFERRAL_REWARD_POINTS = 55; // Points awarded per valid referral
const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export class ReferralSystemService {
  private referralCodes = new Map<string, ReferralCode>();
  private referralLinks = new Map<string, ReferralLink>();
  private userReferralStats = new Map<string, UserReferralStats>();
  private referralRewards: ReferralReward[] = [];
  private codeToUserId = new Map<string, string>(); // Quick lookup

  constructor() {}

  /**
   * Generate a unique referral code for a new user
   * Codes are 8 characters: mix of letters and numbers
   * Examples: AB2C4E5F, XY7Z9P2L
   */
  generateReferralCode(): string {
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = this.createRandomCode();
      attempts++;
    } while (this.codeToUserId.has(code) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique referral code after multiple attempts');
    }

    return code;
  }

  /**
   * Create a referral code for a new user
   * Called automatically when user account is created
   */
  createUserReferralCode(userId: string): ReferralCode {
    // Check if user already has a code
    const existingCode = this.getUserReferralCode(userId);
    if (existingCode) {
      return existingCode;
    }

    const code = this.generateReferralCode();
    const referralCode: ReferralCode = {
      id: this.generateId(),
      userId,
      code,
      createdAt: new Date(),
      isActive: true,
      totalReferred: 0,
      totalRewardsEarned: 0,
    };

    this.referralCodes.set(referralCode.id, referralCode);
    this.codeToUserId.set(code, userId);

    // Initialize stats for this user
    if (!this.userReferralStats.has(userId)) {
      this.userReferralStats.set(userId, {
        userId,
        referralCode: code,
        totalReferred: 0,
        activeReferrals: 0,
        totalPointsEarned: 0,
        joinedViaReferral: false,
      });
    }

    return referralCode;
  }

  /**
   * Get referral code for a user
   */
  getUserReferralCode(userId: string): ReferralCode | null {
    const codes = Array.from(this.referralCodes.values()).filter((c) => c.userId === userId && c.isActive);
    return codes.length > 0 ? codes[0] : null;
  }

  /**
   * Validate a referral code
   */
  validateReferralCode(code: string): { valid: boolean; userId?: string; error?: string } {
    // Check if code exists
    const userId = this.codeToUserId.get(code);
    if (!userId) {
      return { valid: false, error: 'Invalid referral code' };
    }

    // Check if code is active
    const referralCode = this.getUserReferralCode(userId);
    if (!referralCode) {
      return { valid: false, error: 'Referral code is no longer active' };
    }

    // Check if code has expired
    if (referralCode.expiresAt && new Date() > referralCode.expiresAt) {
      return { valid: false, error: 'Referral code has expired' };
    }

    return { valid: true, userId };
  }

  /**
   * Process a new user signup with referral code
   * Called when user registers with a referral code
   */
  processNewUserSignup(
    newUserId: string,
    referralCode?: string
  ): { success: boolean; message: string; pointsAwarded?: number } {
    try {
      // Create referral code for new user
      this.createUserReferralCode(newUserId);

      // If no referral code provided, just complete signup
      if (!referralCode) {
        return { success: true, message: 'User signup completed' };
      }

      // Validate referral code
      const validation = this.validateReferralCode(referralCode);
      if (!validation.valid) {
        return { success: false, message: validation.error || 'Invalid referral code' };
      }

      const referrerId = validation.userId!;

      // Prevent self-referral
      if (referrerId === newUserId) {
        return { success: false, message: 'Cannot refer yourself' };
      }

      // Create referral link
      const referralLink: ReferralLink = {
        id: this.generateId(),
        referrerId,
        referredUserId: newUserId,
        referralCode,
        referredAt: new Date(),
        status: 'completed',
        pointsAwarded: REFERRAL_REWARD_POINTS,
      };

      this.referralLinks.set(referralLink.id, referralLink);

      // Update referrer stats
      const referrerStats = this.userReferralStats.get(referrerId);
      if (referrerStats) {
        referrerStats.totalReferred++;
        referrerStats.activeReferrals++;
        referrerStats.totalPointsEarned += REFERRAL_REWARD_POINTS;
      }

      // Update referred user stats
      const referredStats = this.userReferralStats.get(newUserId);
      if (referredStats) {
        referredStats.referredBy = referrerId;
        referredStats.referredByCode = referralCode;
        referredStats.joinedViaReferral = true;
      }

      // Create reward record
      const reward: ReferralReward = {
        id: this.generateId(),
        userId: referrerId,
        referrerId,
        amount: REFERRAL_REWARD_POINTS,
        reason: `New user signup referral from ${newUserId}`,
        awardedAt: new Date(),
        referralId: referralLink.id,
      };

      this.referralRewards.push(reward);

      return {
        success: true,
        message: `Successfully registered with referral code. Referrer earned ${REFERRAL_REWARD_POINTS} points!`,
        pointsAwarded: REFERRAL_REWARD_POINTS,
      };
    } catch (error) {
      return { success: false, message: `Signup error: ${error}` };
    }
  }

  /**
   * Get referral stats for a user
   */
  getUserReferralStats(userId: string): UserReferralStats | null {
    return this.userReferralStats.get(userId) || null;
  }

  /**
   * Get all referrals for a user
   */
  getUserReferrals(userId: string): ReferralLink[] {
    return Array.from(this.referralLinks.values()).filter((link) => link.referrerId === userId);
  }

  /**
   * Get referral history for a user (who referred them)
   */
  getUserReferrer(userId: string): ReferralLink | null {
    const referral = Array.from(this.referralLinks.values()).find((link) => link.referredUserId === userId);
    return referral || null;
  }

  /**
   * Get total referral rewards for a user
   */
  getUserTotalRewards(userId: string): number {
    return this.referralRewards.reduce((sum, reward) => (reward.userId === userId ? sum + reward.amount : sum), 0);
  }

  /**
   * Admin: Award bonus points to a user
   * Can be used to manually give points to users
   */
  adminAwardPoints(userId: string, points: number, reason: string, adminId: string): ReferralReward {
    const reward: ReferralReward = {
      id: this.generateId(),
      userId,
      referrerId: adminId, // In this case, the admin is the "referrer"
      amount: points,
      reason: `Admin award: ${reason}`,
      awardedAt: new Date(),
      referralId: 'admin-' + this.generateId(),
    };

    this.referralRewards.push(reward);

    // Update user stats
    const stats = this.userReferralStats.get(userId);
    if (stats) {
      stats.totalPointsEarned += points;
    }

    return reward;
  }

  /**
   * Admin: Get all referral data for admin dashboard
   */
  adminGetAllReferralStats(): UserReferralStats[] {
    return Array.from(this.userReferralStats.values());
  }

  /**
   * Admin: Get referral details for a specific user
   */
  adminGetUserReferralDetails(userId: string): {
    stats: UserReferralStats | null;
    referrals: ReferralLink[];
    referrer: ReferralLink | null;
    rewards: ReferralReward[];
  } {
    return {
      stats: this.getUserReferralStats(userId),
      referrals: this.getUserReferrals(userId),
      referrer: this.getUserReferrer(userId),
      rewards: this.referralRewards.filter((r) => r.userId === userId),
    };
  }

  /**
   * Admin: Get all rewards
   */
  adminGetAllRewards(): ReferralReward[] {
    return this.referralRewards;
  }

  /**
   * Admin: Get detailed referral network
   */
  adminGetReferralNetwork(): {
    totalUsers: number;
    usersWithReferrals: number;
    totalReferrals: number;
    totalPointsAwarded: number;
    topReferrers: Array<{ userId: string; referralCount: number; pointsEarned: number }>;
  } {
    const stats = Array.from(this.userReferralStats.values());

    const totalUsers = stats.length;
    const usersWithReferrals = stats.filter((s) => s.totalReferred > 0).length;
    const totalReferrals = stats.reduce((sum, s) => sum + s.totalReferred, 0);
    const totalPointsAwarded = stats.reduce((sum, s) => sum + s.totalPointsEarned, 0);

    const topReferrers = stats
      .filter((s) => s.totalReferred > 0)
      .sort((a, b) => b.totalPointsEarned - a.totalPointsEarned)
      .slice(0, 10)
      .map((s) => ({
        userId: s.userId,
        referralCount: s.totalReferred,
        pointsEarned: s.totalPointsEarned,
      }));

    return {
      totalUsers,
      usersWithReferrals,
      totalReferrals,
      totalPointsAwarded,
      topReferrers,
    };
  }

  /**
   * Deactivate a referral code
   */
  deactivateReferralCode(userId: string): boolean {
    const code = this.getUserReferralCode(userId);
    if (!code) return false;

    code.isActive = false;
    return true;
  }

  /**
   * Check if code already exists
   */
  codeExists(code: string): boolean {
    return this.codeToUserId.has(code);
  }

  // Private helper methods

  private createRandomCode(): string {
    let code = '';
    for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
      code += REFERRAL_CODE_CHARACTERS.charAt(Math.floor(Math.random() * REFERRAL_CODE_CHARACTERS.length));
    }
    return code;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

export const referralSystemService = new ReferralSystemService();
