import { useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";

interface PromptEditorProps {
  onAnalyze: () => void;
  onComplete: () => void;
  onSearchResults: (query: string, results: any[]) => void;
  isAnalyzing: boolean;
}

export default function PromptEditor({ onAnalyze, onComplete, onSearchResults, isAnalyzing }: PromptEditorProps) {
  const editorRef = useRef<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("POST", "/api/companies/search", { query });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      onSearchResults(data.query, data.companies);
      toast({
        title: "Search Complete",
        description: "Company analysis has been completed successfully.",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive",
      });
      onComplete();
    },
  });

  const handleSearch = () => {
    if (!editorRef.current) return;

    const content = editorRef.current.getContent();
    const query = content.replace(/<[^>]+>/g, '').trim();
    if (!query) {
      toast({
        title: "Empty Query",
        description: "Please enter a search query.",
        variant: "destructive",
      });
      return;
    }
    onAnalyze();
    searchMutation.mutate(query);
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
          placeholder: 'Enter a search query (e.g., "mid-sized plumbers in Atlanta")...',
        }}
      />
      <div className="mt-4 flex justify-end">
        <Button 
          onClick={handleSearch} 
          disabled={isAnalyzing || searchMutation.isPending}
        >
          {(isAnalyzing || searchMutation.isPending) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          <Search className="mr-2 h-4 w-4" />
          Search Companies
        </Button>
      </div>
    </Card>
  );
}