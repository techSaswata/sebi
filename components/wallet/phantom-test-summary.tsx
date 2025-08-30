"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react"

export function PhantomTestSummary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          How to Verify Real Phantom Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            If you see "Phantom Connected" but suspect it's mocking, use the components above to verify the connection is real.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-semibold text-sm">✅ Signs of a Real Connection:</h4>
          <div className="space-y-2 text-sm pl-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span><strong>Real Phantom Test</strong> shows "Phantom Extension: Detected"</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span><strong>Connection Validator</strong> shows "Real Connection ✅"</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span><strong>Real vs Mock Test</strong> shows no suspicious patterns</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Balance data shows actual Solana network values</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Console logs show real wallet addresses (not containing "Demo" or "Mock")</span>
            </div>
          </div>

          <h4 className="font-semibold text-sm text-red-700">❌ Signs of Mock/Fake Connection:</h4>
          <div className="space-y-2 text-sm pl-4">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <span>Extension shows "Not Found" but wallet still connects</span>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <span>Wallet addresses contain "Demo", "Mock", or "Test"</span>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <span>Balance is exactly 1.0 SOL (common mock value)</span>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <span>No actual Phantom extension installed in browser</span>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <span>Network data shows suspiciously low slot numbers</span>
            </div>
          </div>

          <h4 className="font-semibold text-sm text-blue-700">🔧 Troubleshooting Steps:</h4>
          <div className="space-y-2 text-sm pl-4">
            <div><strong>1.</strong> Install Phantom browser extension from <a href="https://phantom.app/" target="_blank" className="text-blue-600 underline">phantom.app</a></div>
            <div><strong>2.</strong> Create or import a wallet in Phantom</div>
            <div><strong>3.</strong> Switch to Devnet in Phantom settings</div>
            <div><strong>4.</strong> Refresh this page</div>
            <div><strong>5.</strong> Use "Real Phantom Test" component to verify detection</div>
            <div><strong>6.</strong> Check browser console for detailed connection logs</div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Pro Tip:</strong> Open browser developer tools (F12) and check the Console tab while connecting. 
              Real connections will show detailed logs with actual wallet addresses and network data.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}
