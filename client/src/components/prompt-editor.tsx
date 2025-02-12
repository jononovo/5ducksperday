import { useRef, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface PromptEditorProps {
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export default function PromptEditor({ onAnalyze, isAnalyzing }: PromptEditorProps) {
  const editorRef = useRef<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: async (companyName: string) => {
      const res = await apiRequest("POST", "/api/companies/analyze", { companyName });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Analysis Complete",
        description: "Company analysis has been completed successfully.",
      });
      onAnalyze();
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!editorRef.current) return;

    const content = editorRef.current.getContent();
    const plainText = content.replace(/<[^>]+>/g, '').trim();
    if (!plainText) {
      toast({
        title: "Empty Input",
        description: "Please enter a company name to analyze.",
        variant: "destructive",
      });
      return;
    }
    analyzeMutation.mutate(plainText);
  };

  return (
    <Card className="p-4">
      <Editor
        apiKey="fjabklzyygfhfq8550mc9ts3lm6xh2bbgbuyoxo2huzgyp8e"
        onInit={(_evt, editor) => editorRef.current = editor}
        init={{
          height: 300,
          menubar: false,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'charmap', 'preview',
            'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount'
          ],
          toolbar: 'undo redo | blocks | ' +
            'bold italic forecolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | help',
          placeholder: 'Enter a company name to analyze...',
        }}
      />
      <div className="mt-4 flex justify-end">
        <Button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing || analyzeMutation.isPending}
        >
          {(isAnalyzing || analyzeMutation.isPending) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Analyze Company
        </Button>
      </div>
    </Card>
  );
}