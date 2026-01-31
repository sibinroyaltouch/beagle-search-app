
import React, { useState, useRef, useEffect } from 'react';
import { CompanyInfo, SearchHistoryEntry } from './types';
import { searchCompanies } from './services/geminiService';
import ResultsTable from './components/ResultsTable';

const BeagleAnimation: React.FC<{ activity: string }> = ({ activity }) => {
  switch (activity) {
    case 'running':
      return (
        <div className="relative w-full h-16 flex items-center justify-center overflow-hidden">
          <div className="absolute animate-running flex items-center gap-1 text-amber-500">
            <i className="fa-solid fa-dog text-3xl fa-bounce"></i>
            <div className="flex gap-2 ml-2">
              <i className="fa-solid fa-paw text-[8px] opacity-30 animate-pulse"></i>
              <i className="fa-solid fa-paw text-[8px] opacity-50 animate-pulse delay-75"></i>
            </div>
          </div>
        </div>
      );
    case 'sniffing':
      return (
        <div className="flex flex-col items-center justify-center h-16">
          <div className="text-amber-600 animate-sniffing origin-bottom">
            <i className="fa-solid fa-dog text-3xl"></i>
          </div>
          <div className="flex gap-1 mt-1">
            <span className="w-1 h-1 bg-slate-300 rounded-full animate-ping"></span>
            <span className="w-1 h-1 bg-slate-300 rounded-full animate-ping delay-100"></span>
          </div>
        </div>
      );
    case 'playing':
      return (
        <div className="flex items-center justify-center h-16 gap-4">
          <i className="fa-solid fa-dog text-3xl text-amber-500 animate-bounce"></i>
          <i className="fa-solid fa-bone text-xl text-slate-300 animate-spin-slow"></i>
        </div>
      );
    case 'thinking':
      return (
        <div className="flex items-center justify-center h-16 relative">
          <i className="fa-solid fa-dog text-3xl text-amber-500"></i>
          <div className="absolute -top-2 -right-4 flex gap-1">
            <span className="text-[10px] animate-bounce">💭</span>
          </div>
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center h-16">
          <i className="fa-solid fa-dog text-3xl text-amber-500 animate-pulse"></i>
        </div>
      );
  }
};

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CompanyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [currentActivity, setCurrentActivity] = useState('sniffing');
  const [error, setError] = useState<string | null>(null);
  
  // Admin State
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  
  const abortControllerRef = useRef<boolean>(false);

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('beagle_search_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    const activities = ['running', 'sniffing', 'playing', 'thinking'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % activities.length;
      setCurrentActivity(activities[idx]);
    }, 3500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const saveToHistory = (searchQuery: string, finalResults: CompanyInfo[]) => {
    const newEntry: SearchHistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      query: searchQuery,
      results: finalResults
    };
    const updatedHistory = [newEntry, ...history].slice(0, 50); // Keep last 50
    setHistory(updatedHistory);
    localStorage.setItem('beagle_search_history', JSON.stringify(updatedHistory));
  };

  const performDeepSearch = async (searchQuery: string) => {
    setIsLoading(true);
    setError(null);
    setResults([]);
    abortControllerRef.current = false;
    
    let allFoundResults: CompanyInfo[] = [];
    const MAX_BATCHES = 10;

    const funBlurbs = [
      "Waking up the Pro Beagle...",
      "Analyzing market trends deeply...",
      "Extracting unique entities...",
      "Verifying website links...",
      "Scouring page 5 for rare matches...",
      "Still digging, quality takes time...",
      "Almost done, polishing results...",
      "Gathering the final batch...",
      "Final cross-check for duplicates...",
      "Done! Bringing back your records..."
    ];

    try {
      for (let i = 1; i <= MAX_BATCHES; i++) {
        if (abortControllerRef.current) break;
        
        setProgressStatus(funBlurbs[i-1] || `Scouring Batch ${i}...`);
        
        try {
          const existingNames = allFoundResults.map(r => r.name);
          const data = await searchCompanies(searchQuery, existingNames);
          
          if (data.length === 0) {
            if (i === 1) setError('No companies found.');
            break;
          }

          const newResults = data.filter(newCo => 
            !allFoundResults.some(existingCo => existingCo.name.toLowerCase() === newCo.name.toLowerCase())
          );

          if (newResults.length === 0 && i > 3) break;

          allFoundResults = [...allFoundResults, ...newResults];
          setResults([...allFoundResults]);
          
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (batchError) {
          console.error(`Batch ${i} failed, skipping but continuing:`, batchError);
          continue; 
        }
      }
      
      if (allFoundResults.length > 0) {
        saveToHistory(searchQuery, allFoundResults);
      }
    } catch (err) {
      setError('An unexpected error occurred. Showing all found results.');
      console.error(err);
    } finally {
      setIsLoading(false);
      setProgressStatus('');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    performDeepSearch(query);
  };

  const stopSearch = () => {
    abortControllerRef.current = true;
    setIsLoading(false);
  };

  const generateCSV = (data: CompanyInfo[]) => {
    const headers = ["NO", "Company Name", "Website", "Linkedin URL", "Country", "State", "Industry"];
    const rows = data.map((c, index) => [
      index + 1,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.website.replace(/"/g, '""')}"`,
      `"${c.linkedin.replace(/"/g, '""')}"`,
      `"${c.country.replace(/"/g, '""')}"`,
      `"${c.state.replace(/"/g, '""')}"`,
      `"${c.industry.replace(/"/g, '""')}"`
    ]);
    return [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  };

  const downloadCSV = (data: CompanyInfo[], filename: string) => {
    if (data.length === 0) return;
    const csvContent = generateCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Sibin@8129110807') {
      setIsAdminAuthenticated(true);
      setError(null);
    } else {
      setError('Invalid Access Key.');
    }
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear all history?")) {
      setHistory([]);
      localStorage.removeItem('beagle_search_history');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <i className={`fa-solid fa-dog text-amber-500 ${isLoading ? 'animate-bounce' : ''}`}></i>
              BEAGLE SEARCH <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full ml-1 font-black">PRO</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
              Deep Intelligence Crawler <span className="text-slate-200 mx-1">|</span> developed by <span className="text-amber-600">Sibin Kalliyath</span>
            </p>
          </div>
          <form onSubmit={handleSearch} className="w-full md:w-2/3 lg:w-1/2 flex gap-2">
            <div className="relative flex-grow">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What should Beagle find for you?"
                className="w-full pl-4 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all shadow-sm bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 font-medium"
                disabled={isLoading}
              />
              <div className="absolute right-2 top-1.5 flex gap-1">
                {isLoading ? (
                  <button type="button" onClick={stopSearch} className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                    <i className="fa-solid fa-circle-stop text-xl"></i>
                  </button>
                ) : (
                  <button type="submit" className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors">
                    <i className="fa-solid fa-magnifying-glass text-xl"></i>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-100 p-4 mb-6 rounded-xl flex items-center gap-3">
            <i className="fa-solid fa-circle-exclamation text-red-500 text-lg"></i>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {!showAdmin ? (
          <>
            {results.length > 0 ? (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center bg-slate-50/50 gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        Comprehensive Results
                        {isLoading && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-white animate-pulse uppercase tracking-widest shadow-sm">
                            SNIFFING ALL PAGES...
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Consolidated record count: <span className="text-amber-600 font-bold">{results.length}</span>
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => downloadCSV(results, `beagle_complete_scan_${Date.now()}`)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95">
                        <i className="fa-solid fa-file-csv text-lg"></i>
                        Export CSV
                      </button>
                    </div>
                  </div>
                  
                  {isLoading && (
                    <div className="bg-amber-50/50 p-6 border-b border-amber-100">
                      <div className="max-w-md mx-auto">
                        <BeagleAnimation activity={currentActivity} />
                        <div className="mt-4 text-center">
                          <p className="text-sm font-bold text-amber-800 uppercase tracking-widest animate-pulse">
                            {progressStatus}
                          </p>
                          <div className="mt-2 w-full h-1.5 bg-amber-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 animate-[loading_1.5s_infinite]"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <ResultsTable results={results} />
                  </div>
                </div>
              </div>
            ) : !isLoading && (
              <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                <div className="bg-white p-8 rounded-full shadow-inner mb-6">
                  <i className="fa-solid fa-dog text-7xl opacity-20"></i>
                </div>
                <p className="text-2xl font-black text-slate-400 uppercase tracking-widest">Beagle is Resting</p>
                <p className="text-sm font-medium mt-2">Enter a query to wake up the Pro Beagle.</p>
              </div>
            )}

            {isLoading && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="bg-white p-12 rounded-[2rem] shadow-2xl shadow-amber-200/20 border border-amber-50 text-center max-w-sm w-full">
                  <BeagleAnimation activity={currentActivity} />
                  <h2 className="text-xl font-black text-slate-800 mt-8 tracking-tight uppercase">Deep Intelligence Hunting</h2>
                  <p className="text-amber-600 text-xs font-black uppercase tracking-[0.2em] mt-2 animate-pulse">
                    {progressStatus}
                  </p>
                  <div className="mt-6 space-y-2">
                    <div className="w-full h-2 bg-amber-50 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 animate-[loading_2s_infinite]"></div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold italic">"He's analyzing every page for the best results."</p>
                  </div>
                  <button onClick={stopSearch} className="mt-8 text-xs font-bold text-red-400 hover:text-red-600 underline decoration-2 underline-offset-4 transition-colors">
                    Stop Search
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="max-w-4xl mx-auto py-10">
            {!isAdminAuthenticated ? (
              <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-200 text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fa-solid fa-house-chimney-window text-3xl text-amber-500"></i>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">BEAGLE HOME</h2>
                <p className="text-slate-500 text-sm mb-8">Access the historical logs of Beagle's searches.</p>
                
                <form onSubmit={handleAdminAuth} className="space-y-4 max-w-xs mx-auto">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Beagle Home Key"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-center font-bold tracking-widest"
                  />
                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg"
                  >
                    Enter Home
                  </button>
                </form>
                <button onClick={() => setShowAdmin(false)} className="mt-6 text-slate-400 text-xs font-bold hover:text-slate-600 uppercase tracking-widest">
                  Cancel Access
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-house-chimney-window text-2xl text-amber-500"></i>
                    <div>
                      <h2 className="text-xl font-black text-slate-800">Search Logs</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Archived historical data</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={clearHistory} className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                      Clear All
                    </button>
                    <button onClick={() => setShowAdmin(false)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md">
                      Exit Home
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  {history.length === 0 ? (
                    <div className="p-20 text-center text-slate-300">
                      <i className="fa-solid fa-box-open text-5xl mb-4 opacity-20"></i>
                      <p className="font-bold uppercase tracking-widest">No logs found yet.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-6 py-4">Date & Time</th>
                          <th className="px-6 py-4">Search Query</th>
                          <th className="px-6 py-4">Count</th>
                          <th className="px-6 py-4 text-right">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 text-xs font-bold text-slate-500">{entry.date}</td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-black text-slate-800">{entry.query}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">
                                {entry.results.length} Found
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => downloadCSV(entry.results, `beagle_archive_${entry.query.replace(/\s+/g, '_')}_${entry.id}`)}
                                className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95"
                              >
                                <i className="fa-solid fa-file-csv"></i>
                                Download CSV
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setShowAdmin(true);
                setPassword('');
                setError(null);
              }}
              className="group flex flex-col items-center gap-1 transition-all"
            >
              <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-amber-50 group-hover:scale-110 transition-all border border-slate-100 shadow-sm">
                <i className="fa-solid fa-house-chimney-window text-slate-400 group-hover:text-amber-500 transition-colors"></i>
              </div>
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-amber-600">Beagle Home</span>
            </button>
            <div className="h-10 w-px bg-slate-100 hidden md:block"></div>
            <div>
              <p className="text-slate-500 text-sm font-bold">BEAGLE SEARCH PRO v5.0</p>
              <p className="text-[10px] text-slate-300 font-medium mt-1 uppercase tracking-widest">AI-Powered Entity Extraction Engine</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-300 font-bold">&copy; 2024 Sibin Kalliyath. All Rights Reserved.</p>
        </div>
      </footer>
      
      <style>{`
        @keyframes loading {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 70%; transform: translateX(50%); }
          100% { width: 0%; transform: translateX(200%); }
        }
        @keyframes running {
          0% { transform: translateX(-200%); }
          100% { transform: translateX(200%); }
        }
        @keyframes sniffing {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(15deg) translateY(2px); }
          75% { transform: rotate(-15deg) translateY(2px); }
        }
        .animate-running {
          animation: running 3s linear infinite;
        }
        .animate-sniffing {
          animation: sniffing 0.5s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
