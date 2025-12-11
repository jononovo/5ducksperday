import { useState, useMemo, useCallback } from "react";
import type { Question, FlowConfig, OnboardingFlowReturn } from "../types";

export function useOnboardingFlow<T extends Record<string, string>>(
  config: FlowConfig<T>
): OnboardingFlowReturn<T> {
  const { questions, initialData } = config;
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setDataState] = useState<T>(initialData);

  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (q.conditionalOn) {
        return data[q.conditionalOn as keyof T] === q.conditionalValue;
      }
      return true;
    });
  }, [questions, data]);

  const totalSteps = visibleQuestions.length;
  const currentQuestion = visibleQuestions[currentStep] || null;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const setData = useCallback((key: keyof T, value: string) => {
    setDataState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const canContinue = useCallback((): boolean => {
    if (!currentQuestion) return false;

    const { type, id, validate, optional } = currentQuestion;

    if (
      type === "welcome" ||
      type === "section-intro" ||
      type === "section-complete" ||
      type === "final-complete"
    ) {
      return true;
    }

    if (optional) {
      return true;
    }

    if (validate) {
      return validate(data);
    }

    if (type === "single-select") {
      const value = data[id as keyof T];
      return value !== "" && value !== undefined;
    }

    if (type === "text-input") {
      const value = data[id as keyof T];
      return typeof value === "string" && value.trim() !== "";
    }

    if (type === "multi-field") {
      return true;
    }

    return true;
  }, [currentQuestion, data]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const getButtonText = useCallback((): string => {
    if (!currentQuestion) return "Continue";

    switch (currentQuestion.type) {
      case "welcome":
        return "Let's Go!";
      case "section-intro":
        return "Let's Do It!";
      case "section-complete":
        return "Keep Going";
      case "final-complete":
        return "Start Selling!";
      default:
        if (currentStep === totalSteps - 1) return "Finish";
        return "Continue";
    }
  }, [currentQuestion, currentStep, totalSteps]);

  return {
    currentStep,
    data,
    visibleQuestions,
    totalSteps,
    progress,
    currentQuestion,
    setData,
    handleNext,
    handleBack,
    canContinue,
    getButtonText,
  };
}
