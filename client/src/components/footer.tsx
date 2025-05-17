import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">5Ducks</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Helping you discover and connect with your ideal prospects, 5 contacts at a time.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/pricing">
                  <a className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                    Pricing
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/levels">
                  <a className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                    Levels
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/blog">
                  <a className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                    Blog
                  </a>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contact">
                  <a className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                    Contact
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/support">
                  <a className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                    Support
                  </a>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy">
                  <a className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                    Privacy Policy
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <a className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                    Terms of Service
                  </a>
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-600 dark:text-slate-400">
          <p>© {new Date().getFullYear()} 5Ducks. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}