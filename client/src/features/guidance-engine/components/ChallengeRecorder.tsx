import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Circle, Square, Loader2, Check, Copy, X, ChevronDown, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUESTS } from "../quests";
import type { RecordedStep, GeneratedChallenge } from "../types";

interface ChallengeRecorderProps {
  isOpen: boolean;
  onClose: () => void;
}

type RecorderState = "idle" | "recording" | "processing" | "complete";

function getBestSelector(element: HTMLElement): string {
  if (element.dataset.testid) {
    return `[data-testid="${element.dataset.testid}"]`;
  }
  
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(c => c && !c.startsWith('hover:') && !c.startsWith('focus:'));
    if (classes.length > 0) {
      const uniqueClasses = classes.slice(0, 3).join('.');
      return `${element.tagName.toLowerCase()}.${uniqueClasses}`;
    }
  }
  
  return element.tagName.toLowerCase();
}

function getElementDescription(element: HTMLElement): string {
  const text = element.textContent?.trim().slice(0, 50);
  if (text) return text;
  
  if (element.getAttribute('placeholder')) {
    return element.getAttribute('placeholder') || '';
  }
  
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label') || '';
  }
  
  return element.tagName.toLowerCase();
}

export function ChallengeRecorder({ isOpen, onClose }: ChallengeRecorderProps) {
  const [location] = useLocation();
  const [state, setState] = useState<RecorderState>("idle");
  const [selectedQuestId, setSelectedQuestId] = useState<string>(QUESTS[0]?.id || "");
  const [steps, setSteps] = useState<RecordedStep[]>([]);
  const [startRoute, setStartRoute] = useState<string>("");
  const [generatedChallenge, setGeneratedChallenge] = useState<GeneratedChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [insertResult, setInsertResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const recordingRef = useRef(false);

  const handleClick = useCallback((e: MouseEvent) => {
    if (!recordingRef.current) return;
    
    const target = e.target as HTMLElement;
    
    if (target.closest('[data-recorder-ui]')) return;
    
    const selector = getBestSelector(target);
    const step: RecordedStep = {
      selector,
      action: "click",
      tagName: target.tagName.toLowerCase(),
      textContent: getElementDescription(target),
      route: window.location.pathname,
      timestamp: Date.now(),
    };
    
    setSteps(prev => [...prev, step]);
  }, []);

  const handleInput = useCallback((e: Event) => {
    if (!recordingRef.current) return;
    
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target.tagName || !['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
    
    if (target.closest('[data-recorder-ui]')) return;
    
    const selector = getBestSelector(target);
    
    setSteps(prev => {
      const lastStep = prev[prev.length - 1];
      if (lastStep && lastStep.selector === selector && lastStep.action === "type") {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...lastStep,
          typedValue: target.value,
        };
        return updated;
      }
      
      return [...prev, {
        selector,
        action: "type" as const,
        tagName: target.tagName.toLowerCase(),
        textContent: target.placeholder || "input field",
        typedValue: target.value,
        route: window.location.pathname,
        timestamp: Date.now(),
      }];
    });
  }, []);

  const removeListeners = useCallback(() => {
    recordingRef.current = false;
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("input", handleInput, true);
  }, [handleClick, handleInput]);

  useEffect(() => {
    if (state === "recording") {
      recordingRef.current = true;
      document.addEventListener("click", handleClick, true);
      document.addEventListener("input", handleInput, true);
      
      return removeListeners;
    } else {
      removeListeners();
    }
  }, [state, handleClick, handleInput, removeListeners]);

  const startRecording = () => {
    if (!selectedQuestId) {
      setError("Please select a quest before recording");
      return;
    }
    setSteps([]);
    setStartRoute(location);
    setError(null);
    setGeneratedChallenge(null);
    setState("recording");
  };

  const stopRecording = async () => {
    removeListeners();
    setState("processing");
    
    try {
      const response = await fetch("/api/guidance/generate-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questId: selectedQuestId,
          startRoute,
          steps,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate challenge");
      }
      
      const data = await response.json();
      setGeneratedChallenge(data.challenge);
      setState("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate challenge");
      setState("idle");
    }
  };

  const copyToClipboard = () => {
    if (!generatedChallenge) return;
    
    const code = JSON.stringify(generatedChallenge, null, 2);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const insertIntoQuest = async () => {
    if (!generatedChallenge || !selectedQuestId) return;
    
    setIsInserting(true);
    setInsertResult(null);
    
    try {
      const response = await fetch(`/api/guidance/quests/${selectedQuestId}/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge: generatedChallenge }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setInsertResult({ success: false, message: data.message || "Failed to insert challenge" });
      } else {
        setInsertResult({ success: true, message: data.message || "Challenge inserted successfully!" });
      }
    } catch (err) {
      setInsertResult({ success: false, message: err instanceof Error ? err.message : "Failed to insert challenge" });
    } finally {
      setIsInserting(false);
    }
  };

  const reset = () => {
    recordingRef.current = false;
    setState("idle");
    setSteps([]);
    setGeneratedChallenge(null);
    setError(null);
    setInsertResult(null);
  };

  const handleClose = () => {
    removeListeners();
    setState("idle");
    setSteps([]);
    setGeneratedChallenge(null);
    setError(null);
    setDropdownOpen(false);
    setInsertResult(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen && state === "recording") {
      recordingRef.current = false;
      setState("idle");
    }
  }, [isOpen, state]);

  if (!isOpen) return null;

  const selectedQuest = QUESTS.find(q => q.id === selectedQuestId);

  return createPortal(
    <div data-recorder-ui="true">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 right-6 z-[9999] bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-80 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state === "recording" ? "bg-red-500 animate-pulse" : "bg-gray-500"}`} />
              <span className="text-sm font-medium text-white">Challenge Recorder</span>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
              data-testid="recorder-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {state === "idle" && (
              <>
                {QUESTS.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400">No quests available.</p>
                    <p className="text-xs text-gray-500 mt-1">Add quests to the quests.ts file first.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 uppercase tracking-wide">Select Quest</label>
                      <div className="relative">
                        <button
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm hover:border-gray-500 transition-colors"
                          data-testid="quest-selector"
                        >
                          <span className="flex items-center gap-2">
                            <span>{selectedQuest?.emoji}</span>
                            <span className="truncate">{selectedQuest?.name}</span>
                          </span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {dropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50"
                            >
                              {QUESTS.map((quest) => (
                                <button
                                  key={quest.id}
                                  onClick={() => {
                                    setSelectedQuestId(quest.id);
                                    setDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors ${
                                    quest.id === selectedQuestId ? 'bg-gray-700 text-amber-400' : 'text-white'
                                  }`}
                                >
                                  <span>{quest.emoji}</span>
                                  <span className="truncate">{quest.name}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <Button
                      onClick={startRecording}
                      disabled={!selectedQuestId}
                      className="w-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="start-recording"
                    >
                      <Circle className="h-4 w-4 mr-2 fill-current" />
                      Start Recording
                    </Button>
                  </>
                )}

                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
              </>
            )}

            {state === "recording" && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Recording Steps</span>
                    <span className="text-xs text-amber-400 font-medium">{steps.length} steps</span>
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {steps.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Click elements to record steps...</p>
                    ) : (
                      steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-300 bg-gray-800 rounded px-2 py-1">
                          <span className="text-amber-400">{step.action}</span>
                          <span className="truncate">{step.textContent || step.selector}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  onClick={stopRecording}
                  disabled={steps.length === 0}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  data-testid="stop-recording"
                >
                  <Square className="h-4 w-4 mr-2 fill-current" />
                  Stop & Generate
                </Button>
              </>
            )}

            {state === "processing" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
                <p className="text-sm text-gray-300">Generating challenge with AI...</p>
              </div>
            )}

            {state === "complete" && generatedChallenge && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-white">Challenge Generated!</span>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{generatedChallenge.emoji}</span>
                      <span className="text-sm font-medium text-white">{generatedChallenge.name}</span>
                    </div>
                    <p className="text-xs text-gray-400">{generatedChallenge.description}</p>
                    <p className="text-xs text-gray-500">{generatedChallenge.steps.length} steps</p>
                  </div>
                </div>

                {insertResult && (
                  <div className={`text-xs px-3 py-2 rounded-lg ${insertResult.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                    {insertResult.message}
                  </div>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={insertIntoQuest}
                    disabled={isInserting || insertResult?.success}
                    className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                    data-testid="insert-challenge"
                  >
                    {isInserting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : insertResult?.success ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {isInserting ? "Inserting..." : insertResult?.success ? "Inserted!" : "Insert into Quest File"}
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      className="flex-1 border-gray-600 text-white hover:bg-gray-800"
                      data-testid="copy-challenge"
                    >
                      {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button
                      onClick={reset}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                      data-testid="record-another"
                    >
                      Record Another
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
