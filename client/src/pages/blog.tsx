import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

const posts = [
  {
    title: "Advanced AI Features Released",
    date: "2025-02-15",
    excerpt: "Introducing our latest AI-powered features for better business intelligence gathering and analysis.",
    tag: "Product Update"
  },
  {
    title: "5 Ducks Raises Series A Funding",
    date: "2025-02-01",
    excerpt: "We're excited to announce our successful Series A funding round, led by top-tier investors.",
    tag: "Company News"
  },
  {
    title: "New Gmail Integration Features",
    date: "2025-01-20",
    excerpt: "Enhanced Gmail API integration with improved email discovery and management capabilities.",
    tag: "Feature Update"
  },
  {
    title: "2025 Business Intelligence Trends",
    date: "2025-01-10",
    excerpt: "Our analysis of the top business intelligence trends to watch in 2025.",
    tag: "Industry Insights"
  }
];

export default function Blog() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Latest Updates</h1>
          
          <div className="space-y-8">
            {posts.map((post) => (
              <Card key={post.title} className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {post.tag}
                    </span>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4 mr-1" />
                      {new Date(post.date).toLocaleDateString()}
                    </div>
                  </div>
                  <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                  <Button variant="ghost" className="group-hover:text-primary transition-colors">
                    Read More
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button variant="outline">Load More Posts</Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
