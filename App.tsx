
import React, { useState, useEffect } from 'react';
import { UserProfile } from './types';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load profile from localStorage (simulating persistence after Firebase write)
    const saved = localStorage.getItem('user_profile');
    if (saved) {
      setUserProfile(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const handleOnboardingComplete = (profile: UserProfile) => {
    localStorage.setItem('user_profile', JSON.stringify(profile));
    setUserProfile(profile);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FDF8F5]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-[#E8A2AF] rounded-full mb-4"></div>
          <p className="text-[#E8A2AF] font-medium">Cargando tu bienestar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF8F5] max-w-md mx-auto relative overflow-x-hidden shadow-xl border-x border-pink-50">
      {!userProfile ? (
        <Onboarding onComplete={handleOnboardingComplete} />
      ) : (
        <Dashboard profile={userProfile} />
      )}
    </div>
  );
};

export default App;
