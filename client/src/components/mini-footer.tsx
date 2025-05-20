import { Link } from "wouter";

export function MiniFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 py-4 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            © {new Date().getFullYear()} 5Ducks. All rights reserved.
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://www.linkedin.com/company/5ducks/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}