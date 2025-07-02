import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TooltipStep {
  id: string;
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  offset?: { x: number; y: number };
}

interface TooltipGuideProps {
  steps: TooltipStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const TooltipGuide: React.FC<TooltipGuideProps> = ({
  steps,
  isActive,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !steps[currentStep]) return;

    const updateTooltipPosition = () => {
      const target = document.querySelector(steps[currentStep].target) as HTMLElement;
      if (target) {
        setTargetElement(target);
        const rect = target.getBoundingClientRect();
        const step = steps[currentStep];
        const offset = step.offset || { x: 0, y: 0 };
        
        let x = rect.left + rect.width / 2 + offset.x;
        let y = rect.top + offset.y;

        switch (step.position) {
          case 'top':
            y = rect.top - 10;
            break;
          case 'bottom':
            y = rect.bottom + 10;
            break;
          case 'left':
            x = rect.left - 10;
            y = rect.top + rect.height / 2;
            break;
          case 'right':
            x = rect.right + 10;
            y = rect.top + rect.height / 2;
            break;
          default:
            y = rect.bottom + 10;
        }

        setTooltipPosition({ x, y });
        
        // Add highlight to target element
        target.style.position = 'relative';
        target.style.zIndex = '9999';
        target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
        target.style.borderRadius = '8px';
      }
    };

    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition);

    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition);
      
      // Remove highlight
      if (targetElement) {
        targetElement.style.boxShadow = '';
        targetElement.style.zIndex = '';
      }
    };
  }, [currentStep, isActive, steps, targetElement]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      // Remove highlight from current element
      if (targetElement) {
        targetElement.style.boxShadow = '';
        targetElement.style.zIndex = '';
      }
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      // Remove highlight from current element
      if (targetElement) {
        targetElement.style.boxShadow = '';
        targetElement.style.zIndex = '';
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Remove highlight from current element
    if (targetElement) {
      targetElement.style.boxShadow = '';
      targetElement.style.zIndex = '';
    }
    onComplete();
  };

  const handleSkip = () => {
    // Remove highlight from current element
    if (targetElement) {
      targetElement.style.boxShadow = '';
      targetElement.style.zIndex = '';
    }
    onSkip();
  };

  if (!isActive || !steps[currentStep]) return null;

  const step = steps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998]" />
      
      {/* Tooltip */}
      <div
        className="fixed z-[10000] bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-sm"
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`,
          transform: 'translate(-50%, -100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">{step.title}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <p className="text-gray-600 mb-4 text-sm leading-relaxed">
          {step.content}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {currentStep + 1} of {steps.length}
          </div>
          
          <div className="flex items-center space-x-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
                className="flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
            )}
            
            <Button
              size="sm"
              onClick={nextStep}
              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700"
            >
              <span>{currentStep === steps.length - 1 ? 'Finish' : 'Next'}</span>
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center mt-3 space-x-1">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
};

// Hook for managing tooltip guide state
export const useTooltipGuide = () => {
  const [isNewUser, setIsNewUser] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Check if user has seen the guide before
    const hasSeenGuide = localStorage.getItem('tooltipGuideCompleted');
    if (!hasSeenGuide) {
      setIsNewUser(true);
      // Show guide after a short delay to ensure page is loaded
      setTimeout(() => setShowGuide(true), 1000);
    }
  }, []);

  const completeGuide = () => {
    localStorage.setItem('tooltipGuideCompleted', 'true');
    setShowGuide(false);
    setIsNewUser(false);
  };

  const skipGuide = () => {
    localStorage.setItem('tooltipGuideCompleted', 'true');
    setShowGuide(false);
    setIsNewUser(false);
  };

  const startGuide = () => {
    setShowGuide(true);
  };

  return {
    isNewUser,
    showGuide,
    completeGuide,
    skipGuide,
    startGuide
  };
};