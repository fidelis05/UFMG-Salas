import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getSalasCompleto } from "../services/salas";
import { filterRooms, type RoomRecord } from "../utils/searchHelpers";

interface RoomResult {
  fonte: string;
  codigo_materia: string;
  nome_materia: string;
  turma: string;
  dia_semana: string;
  hora_inicial: string;
  hora_final: string;
  nome_sala: string;
}

const Home = () => {
  const [allRooms, setAllRooms] = useState<RoomRecord[]>([]);
  const [listReady, setListReady] = useState(false);
  const [results, setResults] = useState<RoomResult[]>([]);
  const [searched, setSearched] = useState(false);

  const [filters, setFilters] = useState({
    fonte: "",
    materia: "",
    turma: "",
    sala: ""
  });

  useEffect(() => {
    let cancelled = false;
    getSalasCompleto()
      .then((rooms) => {
        if (!cancelled) setAllRooms(rooms);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setListReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    setResults(filterRooms(allRooms, filters).slice(0, 100) as RoomResult[]);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesse sua Grade de Horários</h2>
        <p className="text-gray-500 mb-6">Veja todas as suas salas cadastradas sem precisar buscar manualmente cada disciplina.</p>
        <Link 
          to="/grade"
          className="bg-[#D44A61] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#b93d52] transition-colors w-full md:w-auto text-lg shadow-md"
        >
          Entrar com Minha UFMG
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Pesquisar Turmas</h3>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instituto/Departamento</label>
              <select 
                name="fonte" 
                value={filters.fonte} 
                onChange={handleFilterChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D44A61]/50 focus:border-[#D44A61] transition-colors"
              >
                <option value="">Todos</option>
                <option value="ENGENHARIA">Engenharia</option>
                <option value="ICEX">ICEx</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina (Nome ou Código)</label>
              <input 
                type="text" 
                name="materia" 
                placeholder="Ex: DCC001 ou Programação" 
                value={filters.materia} 
                onChange={handleFilterChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D44A61]/50 focus:border-[#D44A61] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
              <input 
                type="text" 
                name="turma" 
                placeholder="Ex: TP1, A" 
                value={filters.turma} 
                onChange={handleFilterChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D44A61]/50 focus:border-[#D44A61] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sala</label>
              <input 
                type="text" 
                name="sala" 
                placeholder="Ex: 2030, CAD" 
                value={filters.sala} 
                onChange={handleFilterChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D44A61]/50 focus:border-[#D44A61] transition-colors"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!listReady}
              className="bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-900 transition-colors w-full md:w-auto disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {!listReady ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w000.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Carregando lista...
                </>
              ) : "Pesquisar"}
            </button>
          </div>
        </form>
      </div>

      {searched && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800">Resultados da Busca ({results.length}{results.length >= 100 ? '+' : ''})</h3>
          
          {results.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
              Nenhuma sala encontrada para estes filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((room, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">
                      {room.fonte}
                    </span>
                    <span className="bg-[#D44A61]/10 text-[#D44A61] text-xs font-bold px-2 py-1 rounded">
                      {room.codigo_materia || 'S/C'} - Turma {room.turma}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-800 line-clamp-2">{room.nome_materia}</h4>
                  <div className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" xmlns="http://www.w000.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      {room.dia_semana}, {room.hora_inicial} - {room.hora_final}
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" xmlns="http://www.w000.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      <span className="font-semibold text-gray-800">{room.nome_sala}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;