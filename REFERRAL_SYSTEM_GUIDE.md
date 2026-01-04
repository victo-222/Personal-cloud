# Referral System Documentation

## Overview

The Referral System is a comprehensive user acquisition and engagement feature that rewards users for referring their friends. It includes unique referral codes, point rewards, admin management, and detailed analytics.

## Key Features

- ✅ **Unique Referral Codes**: Each user gets an auto-generated 8-character code (e.g., `AB2C4E5F`)
- ✅ **Optional During Signup**: New users can optionally enter a referral code during signup
- ✅ **Automatic Rewards**: 55 points awarded for each valid referral
- ✅ **Self-Referral Prevention**: Users cannot refer themselves
- ✅ **Admin Controls**: Administrators can manually award points to users
- ✅ **Comprehensive Analytics**: View referral network stats, top referrers, and user details
- ✅ **Error Handling**: Proper validation for invalid codes, expired codes, and duplicate prevention

## Core Components

### 1. ReferralSystemService (`src/lib/referral-system.ts`)

The main service that handles all referral logic.

#### Key Methods

**Code Management**:
- `generateReferralCode()` - Creates a unique 8-character code
- `createUserReferralCode(userId)` - Auto-assigns a code to a new user
- `getUserReferralCode(userId)` - Retrieves a user's referral code
- `validateReferralCode(code)` - Validates a code for signup
- `deactivateReferralCode(userId)` - Deactivates a user's code

**Referral Processing**:
- `processNewUserSignup(newUserId, referralCode?)` - Main signup handler with optional referral
- `getUserReferralStats(userId)` - Get user's referral statistics
- `getUserReferrals(userId)` - Get users referred by this user
- `getUserReferrer(userId)` - Get who referred this user
- `getUserTotalRewards(userId)` - Calculate total earned points

**Admin Functions**:
- `adminAwardPoints(userId, points, reason, adminId)` - Manually award points
- `adminGetAllReferralStats()` - Get stats for all users
- `adminGetUserReferralDetails(userId)` - Comprehensive user profile
- `adminGetAllRewards()` - Get all reward records (audit trail)
- `adminGetReferralNetwork()` - Analytics dashboard data

**Validation**:
- `codeExists(code)` - Check if a code is already used

#### Constants

```typescript
export const REFERRAL_REWARD_POINTS = 55; // Points per referral
export const REFERRAL_CODE_LENGTH = 8;   // Code length
```

### 2. UI Components

#### AdminReferralPanel.tsx
Admin dashboard for managing the referral system.

**Features**:
- **Overview Tab**: Network statistics, top 10 referrers
- **Users Tab**: Search and view all users with their referral codes
- **Award Points Tab**: Manually award bonus points to users
- **Details Tab**: View comprehensive user referral profile

**Usage**:
```tsx
<AdminReferralPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
```

#### ReferralSignupModal.tsx
New user signup modal with referral code entry.

**Flow**:
1. User enters optional referral code (8 characters)
2. System validates the code
3. User enters user ID to complete signup
4. System processes signup and awards points if referral is valid
5. Success page shows new user's referral code and points earned

**Usage**:
```tsx
<ReferralSignupModal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)}
  onSignup={(result) => {
    console.log('Signup result:', result);
  }}
/>
```

#### UserReferralStatsModal.tsx
Display user's referral statistics and performance.

**Features**:
- **Overview Tab**: Display referral code with copy/share buttons, stats grid
- **Referrals Tab**: List of users referred by this user with status and points
- **Referrer Tab**: Show who referred this user (if applicable)

**Usage**:
```tsx
<UserReferralStatsModal 
  userId={userId} 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)} 
/>
```

## Data Types

### ReferralCode
```typescript
interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  totalReferred: number;
  totalRewardsEarned: number;
}
```

### ReferralLink
```typescript
interface ReferralLink {
  id: string;
  referrerId: string;
  referredUserId: string;
  referralCode: string;
  referredAt: Date;
  status: 'pending' | 'active' | 'cancelled';
  pointsAwarded: number;
}
```

### UserReferralStats
```typescript
interface UserReferralStats {
  userId: string;
  referralCode: string;
  totalReferred: number;
  activeReferrals: number;
  totalPointsEarned: number;
  referredBy?: string;
  referredByCode?: string;
  joinedViaReferral: boolean;
}
```

### ReferralReward
```typescript
interface ReferralReward {
  id: string;
  userId: string;
  referrerId: string;
  amount: number;
  reason: string;
  awardedAt: Date;
  referralId?: string;
}
```

## Integration Guide

### 1. Add to Desktop Component

```tsx
import { AdminReferralPanel } from '@/components/desktop/AdminReferralPanel';
import { ReferralSignupModal } from '@/components/desktop/ReferralSignupModal';
import { UserReferralStatsModal } from '@/components/desktop/UserReferralStatsModal';

// In Desktop component state
const [showAdminReferral, setShowAdminReferral] = useState(false);
const [showSignupReferral, setShowSignupReferral] = useState(false);
const [showUserStats, setShowUserStats] = useState(false);
const [selectedUserId, setSelectedUserId] = useState('');

// In render
<AdminReferralPanel isOpen={showAdminReferral} onClose={() => setShowAdminReferral(false)} />
<ReferralSignupModal isOpen={showSignupReferral} onClose={() => setShowSignupReferral(false)} />
<UserReferralStatsModal userId={selectedUserId} isOpen={showUserStats} onClose={() => setShowUserStats(false)} />
```

### 2. Add to Admin Dashboard

```tsx
// In AdminDashboardModal or SettingsPanel
<Button onClick={() => setShowAdminReferral(true)}>
  <Gift className="w-4 h-4 mr-2" />
  Referral System
</Button>
```

### 3. Integrate with User Signup

```tsx
// Show referral signup modal during new user registration
const handleUserSignup = () => {
  setShowSignupReferral(true);
};
```

### 4. Show User Stats

```tsx
// Add button to user profile or settings
<Button onClick={() => {
  setSelectedUserId(currentUserId);
  setShowUserStats(true);
}}>
  <Gift className="w-4 h-4 mr-2" />
  View Referral Stats
</Button>
```

## API Endpoints (Example Implementation)

### POST /api/users/signup
Create new user with optional referral code

```typescript
interface SignupRequest {
  userId: string;
  referralCode?: string;
}

interface SignupResponse {
  success: boolean;
  message: string;
  pointsAwarded?: number;
}
```

### GET /api/referrals/:userId/stats
Get user's referral statistics

```typescript
interface ReferralStatsResponse extends UserReferralStats {}
```

### GET /api/referrals/:userId/referrals
Get list of users referred by this user

```typescript
interface ReferralsListResponse {
  referrals: ReferralLink[];
}
```

### POST /api/admin/referrals/award-points
Manually award points to a user

```typescript
interface AwardPointsRequest {
  userId: string;
  points: number;
  reason: string;
  adminId: string;
}

interface AwardPointsResponse {
  success: boolean;
  message: string;
}
```

### GET /api/admin/referrals/network
Get referral network analytics

```typescript
interface NetworkAnalyticsResponse {
  totalUsers: number;
  usersWithReferrals: number;
  totalReferrals: number;
  totalPointsAwarded: number;
  topReferrers: Array<{
    userId: string;
    referralCount: number;
    pointsEarned: number;
  }>;
}
```

### GET /api/admin/referrals/:userId/details
Get comprehensive user referral details

```typescript
interface UserDetailsResponse {
  stats: UserReferralStats;
  referrals: ReferralLink[];
  rewards: ReferralReward[];
  referrer?: ReferralLink;
}
```

## Database Schema (Example - MongoDB)

### users Collection
```javascript
{
  _id: ObjectId,
  userId: "user123",
  email: "user@example.com",
  referralCodeId: ObjectId,
  referredBy?: ObjectId,
  points: 550,
  createdAt: Date,
  updatedAt: Date
}
```

### referralCodes Collection
```javascript
{
  _id: ObjectId,
  userId: "user123",
  code: "AB2C4E5F",
  createdAt: Date,
  expiresAt: null,
  isActive: true,
  totalReferred: 5,
  totalRewardsEarned: 275
}
```

### referralLinks Collection
```javascript
{
  _id: ObjectId,
  referrerId: "user123",
  referredUserId: "user456",
  referralCode: "AB2C4E5F",
  referredAt: Date,
  status: "active",
  pointsAwarded: 55
}
```

### referralRewards Collection
```javascript
{
  _id: ObjectId,
  userId: "user123",
  referrerId: "admin",
  amount: 100,
  reason: "Manual bonus award",
  awardedAt: Date,
  referralId: null
}
```

## Error Handling

The system handles the following error cases:

| Error | Message |
|-------|---------|
| Invalid code format | "Referral code must be 8 characters long" |
| Code not found | "Invalid referral code" |
| Code expired | "Referral code has expired" |
| Code inactive | "Referral code is no longer active" |
| Self-referral | "You cannot refer yourself" |
| User already exists | "User already exists in the system" |

## Usage Examples

### Example 1: Basic Signup with Referral

```typescript
const result = referralSystemService.processNewUserSignup('new_user_123', 'AB2C4E5F');

// Result:
// {
//   success: true,
//   message: "User registered successfully with referral",
//   pointsAwarded: 55
// }
```

### Example 2: Admin Award Points

```typescript
referralSystemService.adminAwardPoints(
  'user_123',
  100,
  'Monthly bonus',
  'admin_001'
);
```

### Example 3: Get User Stats

```typescript
const stats = referralSystemService.getUserReferralStats('user_123');

// Stats:
// {
//   userId: 'user_123',
//   referralCode: 'AB2C4E5F',
//   totalReferred: 5,
//   activeReferrals: 4,
//   totalPointsEarned: 275,
//   referredBy: 'user_456',
//   joinedViaReferral: true
// }
```

### Example 4: Get Network Analytics

```typescript
const network = referralSystemService.adminGetReferralNetwork();

// Network:
// {
//   totalUsers: 1000,
//   usersWithReferrals: 250,
//   totalReferrals: 750,
//   totalPointsAwarded: 41250,
//   topReferrers: [...]
// }
```

## Security Considerations

1. **Unique Code Generation**: Codes use Map-based lookup to prevent collisions
2. **Self-Referral Prevention**: System checks if referrer and referred user are the same
3. **Admin Authority**: Admin point awards are tracked with admin ID for audit trail
4. **Code Expiration**: Optional expiration support for time-limited codes
5. **Audit Trail**: All rewards recorded in ReferralReward collection
6. **Status Tracking**: Referrals can be marked as pending/active/cancelled

## Performance Optimization

- **O(1) Code Lookup**: Using Map-based data structure for instant code validation
- **User Stats Cache**: Stats updated atomically when referral is processed
- **Batch Admin Queries**: adminGetAllReferralStats() retrieves all stats efficiently
- **Top Referrers Index**: Maintains sorted list for quick retrieval

## Future Enhancements

- [ ] Tiered referral rewards (more points for higher tiers)
- [ ] Referral leaderboards and rankings
- [ ] Email notifications for referral events
- [ ] Social media integration for sharing
- [ ] Referral team/group bonuses
- [ ] Referral cancellation/refund logic
- [ ] Referral expiration automation
- [ ] Analytics dashboard with charts
- [ ] A/B testing for referral copy
- [ ] Integration with payment systems

## Troubleshooting

### Code not validating
- Check code format: must be exactly 8 characters
- Verify code is active: `deactivateReferralCode()` may have been called
- Check expiration date: may be past the expiration date

### Points not awarded
- Verify referral code is valid
- Check that referrer and referred user are different
- Confirm referral status is 'active'

### Missing statistics
- Ensure user exists in system
- Check that `createUserReferralCode()` was called when user was created
- Verify admin has correct permissions

## Support

For issues or questions about the referral system:
1. Check this documentation
2. Review the ReferralSystemService implementation
3. Check browser console for error messages
4. Review error handling section above
