import React from 'react';
import { MedicalWorkerSubmission } from '../types';
import { Users, Award, Building2, MapPin, CheckCircle2 } from 'lucide-react';

interface StatsCardsProps {
  submissions: MedicalWorkerSubmission[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ submissions }) => {
  const total = submissions.length;
  const certifiedCount = submissions.filter(
    (s) => s.trainingStatus === 'sertifikatlangan' || s.trainingStatus === 'sinovdan_utgan'
  ).length;

  const uniqueWorkplaces = new Set(submissions.map((s) => s.workplace.trim().toLowerCase())).size;
  const uniqueRegions = new Set(submissions.map((s) => s.region)).size;

  const completionPercent = total > 0 ? Math.round((certifiedCount / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Submissions Card */}
      <div id="stat-card-total" className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-blue-200 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Jami O'quvchilar / Xodimlar
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {total.toLocaleString()} <span className="text-xs font-normal text-slate-500">nafar</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-slate-600">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1" />
          <span>Bazada saqlangan yozuvlar</span>
        </div>
      </div>

      {/* Certified / Completed Card */}
      <div id="stat-card-certified" className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-emerald-200 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sertifikatlangan / Sinovdan O'tgan
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {certifiedCount} <span className="text-xs font-normal text-emerald-600 font-semibold">({completionPercent}%)</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-slate-600">
          <div className="w-full bg-slate-100 rounded-full h-2 mr-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="font-semibold text-slate-700">{completionPercent}%</span>
        </div>
      </div>

      {/* Unique Workplaces Card */}
      <div id="stat-card-workplaces" className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-cyan-200 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tibbiyot Muassasalari
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {uniqueWorkplaces} <span className="text-xs font-normal text-slate-500">tashkilot</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-slate-600">
          <span>Poliklinika, shifoxona va TTBlar</span>
        </div>
      </div>

      {/* Regions Covered Card */}
      <div id="stat-card-regions" className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-purple-200 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Viloyatlar Qamrovi
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {uniqueRegions} <span className="text-xs font-normal text-slate-500">/ 14 hudud</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-slate-600">
          <span>Respublika bo'ylab o'qitish</span>
        </div>
      </div>
    </div>
  );
};
