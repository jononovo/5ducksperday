import { useRoute, useLocation } from "wouter";
import { getBlogPost } from "@/lib/blog-data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Tag, User } from "lucide-react";
import { Footer } from "@/components/footer";
import ReactMarkdown from 'react-markdown';

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug || "";
  const post = getBlogPost(slug);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Post not found</h1>
        <Button onClick={() => navigate("/blog")}>Back to Blog</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto py-12 px-4 flex-1">
        <div className="max-w-3xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-8 flex items-center" 
            onClick={() => navigate("/blog")}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Blog
          </Button>

          {post.imageUrl && (
            <div className="mb-8">
              <img 
                src={post.imageUrl} 
                alt={post.title}
                className="w-full h-64 object-cover rounded-xl"
              />
            </div>
          )}

          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
          
          <div className="flex flex-wrap gap-4 mb-8 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center">
              <Calendar size={14} className="mr-1" />
              {post.date}
            </div>
            <div className="flex items-center">
              <User size={14} className="mr-1" />
              {post.author}
            </div>
            <div className="flex items-center">
              <Tag size={14} className="mr-1" />
              {post.category}
            </div>
          </div>

          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span 
                  key={tag}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}