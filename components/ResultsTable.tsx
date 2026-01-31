
import React from 'react';
import { CompanyInfo } from '../types';

interface ResultsTableProps {
  results: CompanyInfo[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  return (
    <table className="w-full text-left border-collapse">
      <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold tracking-wider">
        <tr>
          <th className="px-6 py-4 border-b border-gray-100">NO</th>
          <th className="px-6 py-4 border-b border-gray-100">Company Name</th>
          <th className="px-6 py-4 border-b border-gray-100">Website</th>
          <th className="px-6 py-4 border-b border-gray-100">Linkedin URL</th>
          <th className="px-6 py-4 border-b border-gray-100">Country</th>
          <th className="px-6 py-4 border-b border-gray-100">State</th>
          <th className="px-6 py-4 border-b border-gray-100">Industry</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {results.map((company, index) => (
          <tr key={index} className="hover:bg-blue-50/30 transition-colors">
            <td className="px-6 py-4 text-sm font-medium text-gray-400">
              {index + 1}
            </td>
            <td className="px-6 py-4 text-sm font-bold text-gray-900">
              {company.name}
            </td>
            <td className="px-6 py-4 text-sm">
              {company.website !== 'N/A' ? (
                <a
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <i className="fa-solid fa-link text-[10px]"></i>
                  {company.website.replace(/^https?:\/\//, '').split('/')[0]}
                </a>
              ) : (
                <span className="text-gray-300">N/A</span>
              )}
            </td>
            <td className="px-6 py-4 text-sm">
              {company.linkedin !== 'N/A' ? (
                <a
                  href={company.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-800 hover:text-blue-900 transition-colors"
                >
                  <i className="fa-brands fa-linkedin text-xl"></i>
                </a>
              ) : (
                <span className="text-gray-300">N/A</span>
              )}
            </td>
            <td className="px-6 py-4 text-sm text-gray-600">
              {company.country}
            </td>
            <td className="px-6 py-4 text-sm text-gray-600">
              {company.state}
            </td>
            <td className="px-6 py-4 text-sm font-medium">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {company.industry}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ResultsTable;
