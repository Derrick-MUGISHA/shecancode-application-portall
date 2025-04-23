import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export default function SuccessPage() {
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-700">Application Submitted Successfully!</h1>
        <p className="text-muted-foreground">
          Thank you for submitting your application. We have received your information and will review it shortly. You
          will receive an email notification about the status of your application.
        </p>
        <div className="pt-4">
          <Link href="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
