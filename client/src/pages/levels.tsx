import { Footer } from "@/components/footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default function Levels() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto py-12 px-4 flex-1">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-3">Levels | Become an Eliteist</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 italic">
            (Someone who thinks they are better than others, usually because they have some capacity that most don't.)
          </p>

          <h2 className="text-2xl font-bold mb-6">Checkout our Levels:</h2>

          <div className="space-y-10">
            {/* Level 1 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
                </div>
                <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">HATCHED</h3>
              </div>
              <p className="mb-4">
                <strong>~One week: Limits are doubled</strong> We release the cap of max 5 emails per day.
                You will then be allowed to send up to 10 per day. But we will still only celebrate once the first 5 are sent.
              </p>
            </div>

            {/* Level 2 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mr-4">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">2</span>
                </div>
                <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400">PEEPING</h3>
              </div>
              <p className="mb-4">
                <strong>2-3 weeks: AI Starts Learning</strong><br />
                Our AI engine can begin to analyse which email content and which types of contacts respond best to you.
              </p>
            </div>

            {/* Level 3 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mr-4">
                  <span className="text-green-600 dark:text-green-400 font-bold">3</span>
                </div>
                <h3 className="text-xl font-bold text-green-600 dark:text-green-400">CHIRPING</h3>
              </div>
              <p className="mb-4">
                <strong>After 4-5 weeks: AI Finding the Buyer Profile</strong><br />
                Once you confirm who has purchased or fully qualified, the Duck AI will begin analysing and improving your targets based on that.
              </p>
            </div>

            {/* Level 4 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mr-4">
                  <span className="text-yellow-600 dark:text-yellow-400 font-bold">4</span>
                </div>
                <h3 className="text-xl font-bold text-yellow-600 dark:text-yellow-400">FLAPPING</h3>
              </div>
              <p className="mb-4">
                <strong>Now Mama Duck (AI) can create full campaigns for you.</strong>
              </p>
            </div>

            {/* Level 5 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center mr-4">
                  <span className="text-orange-600 dark:text-orange-400 font-bold">5</span>
                </div>
                <h3 className="text-xl font-bold text-orange-600 dark:text-orange-400">FLUTTERING</h3>
              </div>
              <p className="mb-4">
                <strong>We allow some auto-sending, but only if you are receiving the same number of positive responses.</strong>
              </p>
            </div>

            {/* Level 6 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mr-4">
                  <span className="text-red-600 dark:text-red-400 font-bold">6</span>
                </div>
                <h3 className="text-xl font-bold text-red-600 dark:text-red-400">FLYING</h3>
              </div>
              <p className="mb-4">
                <strong>Full-Auto-Sending is enabled and we understand how you sell and who will buy from you.</strong><br />
                We encourage logging in, but allow auto-sending for up to 7 days at a time. (So that on your holidays you still get points.)
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <Alert className="mt-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle className="mb-2">Disclaimer</AlertTitle>
            <AlertDescription>
              <div className="space-y-4 text-sm">
                <p>
                  The majority of these levels are dependent on you using Gmail as your business email provider. 
                  As with Gmail, we can analyze which contacts that were mailed, actually responded, and whether 
                  those responses were positive or negative.
                </p>
                <p>
                  On the next level, we then can analyze your communication as you guide the potential client to 
                  the sale and understand how you do this to differing needs of customers.
                </p>
                <p>
                  Once the full pipeline is understood, the AI can give custom recommendations as to the responses 
                  and you can just approve them or brush them up a little.
                </p>
                <p>
                  The AI will not read any emails that are not from contacts generated within the app. The analysis 
                  is anonymized and internalized and is only for you and your benefit. This can also be switched off.
                </p>
                <p>
                  In fact, this whole process only moves forward once we receive confirmation from you on:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Whether you have qualified leads or actually made a sale already.</li>
                  <li>If you confirm that you are happy to start receiving response suggestions.</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
      <Footer />
    </div>
  );
}