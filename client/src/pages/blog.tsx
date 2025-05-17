import { Link } from "wouter";
import { getAllBlogPosts } from "@/lib/blog-data";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock, Tag, User } from "lucide-react";
import { Footer } from "@/components/footer";

export default function Blog() {
  const posts = getAllBlogPosts();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto py-12 px-4 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-4">5Ducks Blog</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Insights, tutorials, and updates to help you master the art of focused selling
            </p>
          </div>

          <div className="space-y-10">
            {posts.map((post) => (
              <Card key={post.id} className="overflow-hidden transition hover:shadow-lg">
                <CardHeader className="pb-4">
                  {post.imageUrl && (
                    <div className="mb-4 -mt-6 -mx-6">
                      <img 
                        src={post.imageUrl} 
                        alt={post.title}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  <Link href={`/blog/${post.slug}`}>
                    <CardTitle className="text-2xl font-bold hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                      {post.title}
                    </CardTitle>
                  </Link>
                  <CardDescription className="flex flex-wrap gap-3 mt-2 text-sm">
                    <span className="flex items-center">
                      <Clock size={14} className="mr-1" />
                      {post.date}
                    </span>
                    <span className="flex items-center">
                      <User size={14} className="mr-1" />
                      {post.author}
                    </span>
                    <span className="flex items-center">
                      <Tag size={14} className="mr-1" />
                      {post.category}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">{post.excerpt}</p>
                </CardContent>
                <CardFooter>
                  <Link href={`/blog/${post.slug}`}>
                    <Button variant="ghost" className="text-blue-600 dark:text-blue-400 p-0 flex items-center">
                      Read More <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}