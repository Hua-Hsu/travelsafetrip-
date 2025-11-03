// ================================
// Week 5: 新手教學組件
// components/TutorialOverlay.tsx
// ================================

'use client';

import React, { useState, useEffect } from 'react';

interface TutorialStep {
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface TutorialOverlayProps {
  onComplete: () => void;
  onSkip: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Group Map! 👋",
    description: "Let me show you how to use the map features. This tutorial will only take a minute.",
    position: 'center'
  },
  {
    title: "Step 1: Start Location Tracking 📍",
    description: "First, click the 'Start Tracking' button to share your location with group members.",
    position: 'center'
  },
  {
    title: "Step 2: Set Meet Up Point 🎯",
    description: "Right-click (or long-press on mobile) anywhere on the map to set a meeting point for everyone.",
    position: 'center'
  },
  {
    title: "Step 3: Return to Meet Up Point 🔄",
    description: "If you scroll away, click the purple 'Return to Meet Up Point' button to fly back to the meeting location.",
    position: 'center'
  },
  {
    title: "Step 4: View Other Members 👥",
    description: "You'll see other group members as red dots on the map. Click them to see their distance from you!",
    position: 'center'
  },
  {
    title: "All Set! 🎉",
    description: "You're ready to coordinate with your group. You can restart this tutorial anytime by clicking the 🎓 button.",
    position: 'center'
  }
];

export default function TutorialOverlay({ onComplete, onSkip }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => onComplete(), 300);
  };

  const handleSkipTutorial = () => {
    setIsVisible(false);
    setTimeout(() => onSkip(), 300);
  };

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-slide-up">
        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 rounded-t-2xl overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {step.title}
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-blue-500'
                    : index < currentStep
                    ? 'w-2 bg-blue-300'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                ← Previous
              </button>
            )}
            
            {currentStep < tutorialSteps.length - 1 && (
              <button
                onClick={handleSkipTutorial}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Skip
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              {currentStep === tutorialSteps.length - 1 ? 'Get Started! 🚀' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}