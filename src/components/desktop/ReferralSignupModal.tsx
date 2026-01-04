import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Gift, Copy, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { referralSystemService, REFERRAL_REWARD_POINTS } from '@/lib/referral-system';

interface ReferralSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignup?: (result: { success: boolean; message: string; pointsAwarded?: number }) => void;
}

export const ReferralSignupModal: React.FC<ReferralSignupModalProps> = ({ isOpen, onClose, onSignup }) => {
  const [step, setStep] = useState<'input' | 'confirmation' | 'success'>('input');
  const [referralCode, setReferralCode] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [validationError, setValidationError] = useState('');
  const [validationSuccess, setValidationSuccess] = useState('');
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleValidateCode = () => {
    setValidationError('');
    setValidationSuccess('');

    if (!referralCode.trim()) {
      setValidationError('Please enter a referral code');
      return;
    }

    if (referralCode.length !== 8) {
      setValidationError('Referral code must be 8 characters long');
      return;
    }

    try {
      const validation = referralSystemService.validateReferralCode(referralCode);

      if (!validation.valid) {
        setValidationError(validation.error || 'Invalid referral code');
        return;
      }

      setValidationSuccess(`Valid referral code from user: ${validation.userId?.substring(0, 20)}...`);
      setStep('confirmation');
    } catch (error) {
      setValidationError(`Error: ${error}`);
    }
  };

  const handleCompleteSignup = () => {
    if (!newUserId.trim()) {
      alert('Please enter a user ID');
      return;
    }

    try {
      const result = referralSystemService.processNewUserSignup(newUserId, referralCode || undefined);

      if (result.success) {
        setPointsAwarded(result.pointsAwarded || 0);
        setStep('success');

        if (onSignup) {
          onSignup({
            success: true,
            message: result.message,
            pointsAwarded: result.pointsAwarded,
          });
        }
      } else {
        setValidationError(result.message);
      }
    } catch (error) {
      setValidationError(`Error: ${error}`);
    }
  };

  const handleSkipReferral = () => {
    try {
      const result = referralSystemService.processNewUserSignup(newUserId);

      if (result.success) {
        setPointsAwarded(0);
        setStep('success');

        if (onSignup) {
          onSignup({
            success: true,
            message: result.message,
            pointsAwarded: 0,
          });
        }
      } else {
        setValidationError(result.message);
      }
    } catch (error) {
      setValidationError(`Error: ${error}`);
    }
  };

  const handleClose = () => {
    setStep('input');
    setReferralCode('');
    setNewUserId('');
    setValidationError('');
    setValidationSuccess('');
    setPointsAwarded(0);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Gift className="w-5 h-5 text-green-500" />
            Welcome to Our Community
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {step === 'input' && 'Have a referral code? Enter it to earn bonus points!'}
            {step === 'confirmation' && 'Confirm your signup details'}
            {step === 'success' && 'Your account is ready!'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800 text-sm">
                Enter a referral code to earn <strong>{REFERRAL_REWARD_POINTS} bonus points</strong>. Or skip and create an account
                without one.
              </AlertDescription>
            </Alert>

            <div>
              <label className="text-sm text-gray-300 block mb-2">Referral Code (Optional)</label>
              <Input
                placeholder="e.g., AB2C4E5F"
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value.toUpperCase());
                  setValidationError('');
                  setValidationSuccess('');
                }}
                maxLength={8}
                className="bg-gray-800 border-gray-700 text-white font-mono text-center text-lg tracking-widest"
              />
              <p className="text-xs text-gray-500 mt-1">8 characters, letters and numbers</p>
            </div>

            {validationError && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm">{validationError}</AlertDescription>
              </Alert>
            )}

            {validationSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-sm">{validationSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleValidateCode}
                disabled={!referralCode.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Verify Code
              </Button>
              <Button onClick={handleSkipReferral} variant="outline" className="flex-1 border-gray-600">
                Skip
              </Button>
            </div>
          </div>
        )}

        {step === 'confirmation' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 block mb-2">User ID</label>
              <Input
                placeholder="Enter your user ID"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <Card className="bg-gray-800 border-gray-700 p-3">
              <p className="text-sm text-gray-300 mb-2">Summary</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Referral Code:</span>
                  <code className="bg-gray-900 px-2 py-1 rounded text-white">{referralCode}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bonus Points:</span>
                  <Badge className="bg-green-600">{REFERRAL_REWARD_POINTS} points</Badge>
                </div>
              </div>
            </Card>

            {validationError && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm">{validationError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button onClick={handleCompleteSignup} className="flex-1 bg-green-600 hover:bg-green-700">
                Complete Signup
              </Button>
              <Button
                onClick={() => {
                  setStep('input');
                  setValidationError('');
                  setValidationSuccess('');
                }}
                variant="outline"
                className="flex-1 border-gray-600"
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4">
            <Card className="bg-green-900 border-green-700 p-4 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
              <p className="text-white font-semibold">Welcome!</p>
              <p className="text-green-200 text-sm">Account created successfully</p>
            </Card>

            {pointsAwarded > 0 && (
              <Card className="bg-yellow-900 border-yellow-700 p-4 text-center">
                <Gift className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                <p className="text-white font-semibold">+{pointsAwarded} Points Earned!</p>
                <p className="text-yellow-200 text-sm">Bonus points from referral</p>
              </Card>
            )}

            <Card className="bg-gray-800 border-gray-700 p-4">
              <p className="text-sm text-gray-300 mb-2">Your Referral Code</p>
              <div className="flex items-center gap-2 bg-gray-900 p-3 rounded">
                <code className="flex-1 text-white font-mono text-center text-lg tracking-widest">
                  {referralSystemService.getUserReferralCode(newUserId)?.code}
                </code>
                <button
                  onClick={() => {
                    const code = referralSystemService.getUserReferralCode(newUserId)?.code;
                    if (code) {
                      navigator.clipboard.writeText(code);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Share this code with friends to earn {REFERRAL_REWARD_POINTS} points per referral!</p>
            </Card>

            <Button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700">
              Continue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReferralSignupModal;
