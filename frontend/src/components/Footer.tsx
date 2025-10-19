import React from "react";
import { Link } from "react-router-dom";
import { Twitter, Facebook, Linkedin, Github, Sparkles, Mail, ArrowUpCircle } from "lucide-react";

const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-300">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-fuchsia-600/10 pointer-events-none" />
      
      <div className="relative container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl blur-md opacity-50" />
                <div className="relative bg-gradient-to-br from-violet-600 to-fuchsia-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                IdeaBoard
              </h3>
            </div>
            <p className="text-slate-400 mb-6 max-w-sm leading-relaxed">
              Empowering teams worldwide with seamless collaborative whiteboarding. 
              Create, ideate, and innovate together in real-time.
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-3">
              {[
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: Facebook, href: "#", label: "Facebook" },
                { icon: Linkedin, href: "#", label: "LinkedIn" },
                { icon: Github, href: "#", label: "GitHub" }
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="group relative p-3 bg-slate-800/50 rounded-lg hover:bg-gradient-to-br hover:from-violet-600 hover:to-fuchsia-600 transition-all duration-300 hover:scale-110"
                >
                  <social.icon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>
          </div>
          
          {/* Product Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-lg">Product</h4>
            <ul className="space-y-3">
              {['Features', 'Pricing', 'Templates', 'Changelog'].map((item) => (
                <li key={item}>
                  <Link 
                    to={`/${item.toLowerCase()}`}
                    className="text-slate-400 hover:text-violet-400 transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Resources Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-lg">Resources</h4>
            <ul className="space-y-3">
              {['Blog', 'Tutorials', 'Support', 'API'].map((item) => (
                <li key={item}>
                  <Link 
                    to={`/${item.toLowerCase()}`}
                    className="text-slate-400 hover:text-fuchsia-400 transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Legal Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-lg">Legal</h4>
            <ul className="space-y-3">
              {[
                { name: 'Privacy Policy', path: '/privacy' },
                { name: 'Terms of Service', path: '/terms' },
                { name: 'Security', path: '/security' },
                { name: 'Cookie Policy', path: '/cookies' }
              ].map((item) => (
                <li key={item.path}>
                  <Link 
                    to={item.path}
                    className="text-slate-400 hover:text-cyan-400 transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Newsletter Section */}
        <div className="border-t border-slate-700/50 pt-8 mb-8">
          <div className="max-w-md mx-auto text-center">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Mail className="w-5 h-5 text-violet-400" />
              <h4 className="text-white font-semibold text-lg">Stay Updated</h4>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Get the latest features and updates delivered to your inbox
            </p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email"
                className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
              <button className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105 whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-slate-700/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} IdeaBoard. Crafted with{" "}
            <span className="text-fuchsia-400">❤</span> for collaboration
          </p>
          
          <button
            onClick={scrollToTop}
            className="group flex items-center space-x-2 text-slate-400 hover:text-violet-400 transition-colors duration-200"
          >
            <span className="text-sm font-medium">Back to top</span>
            <ArrowUpCircle className="w-5 h-5 group-hover:-translate-y-1 transition-transform duration-200" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;