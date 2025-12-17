import { useState, useMemo, useCallback } from "react";
import type { Form, FormSlide, FormFlowReturn } from "../types";

export function useFormFlow<T extends Record<string, string>>(
  form: Form<T>
): FormFlowReturn<T> {
  const allSlides = useMemo(() => {
    return form.sections.flatMap((section) => section.slides);
  }, [form.sections]);

  const [currentStep, setCurrentStep] = useState(0);
  const [data, setDataState] = useState<T>(form.initialData);

  const visibleSlides = useMemo(() => {
    return allSlides.filter((slide) => {
      if (slide.conditionalOn) {
        return data[slide.conditionalOn as keyof T] === slide.conditionalValue;
      }
      return true;
    });
  }, [allSlides, data]);

  const totalSteps = visibleSlides.length;
  const currentSlide = visibleSlides[currentStep] || null;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const setData = useCallback((key: keyof T, value: string) => {
    setDataState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const canContinue = useCallback((): boolean => {
    if (!currentSlide) return false;

    const { slideType, id, validate, optional } = currentSlide;

    if (
      slideType === "welcome" ||
      slideType === "section-intro" ||
      slideType === "section-complete" ||
      slideType === "final-complete"
    ) {
      return true;
    }

    if (optional) {
      return true;
    }

    if (validate) {
      return validate(data);
    }

    if (slideType === "single-select") {
      const value = data[id as keyof T];
      return value !== "" && value !== undefined;
    }

    if (slideType === "multi-select") {
      const value = data[id as keyof T];
      return typeof value === "string" && value.trim() !== "";
    }

    if (slideType === "text-input") {
      const value = data[id as keyof T];
      return typeof value === "string" && value.trim() !== "";
    }

    if (slideType === "multi-field") {
      return true;
    }

    return true;
  }, [currentSlide, data]);

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
    if (!currentSlide) return "Continue";

    switch (currentSlide.slideType) {
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
  }, [currentSlide, currentStep, totalSteps]);

  return {
    currentStep,
    data,
    visibleSlides,
    totalSteps,
    progress,
    currentSlide,
    setData,
    handleNext,
    handleBack,
    canContinue,
    getButtonText,
  };
}
