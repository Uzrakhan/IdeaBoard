import { ArrowRight } from "lucide-react"


const DemoBanner = ({ onSignIn }: { onSignIn: () => void }) => {
    return (
        <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white border shadow-md rounded-xl px-4 py-2 flex items-center gap-3"
        >
            <span className="text-sm text-gray-600">
                Demo mode - collaboration disabled
            </span>

            <button
                className="text-sm font-semibold text-indigo-600 flex items-center gap-1 hover:underline"
                onClick={onSignIn}
            >
                Sign in to collaborate <ArrowRight className="w-4 h-4"/>
            </button>
        </div>
    )
}

export default DemoBanner;