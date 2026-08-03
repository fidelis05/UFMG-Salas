const Disclaimer = () => {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-5">
        <h2 className="text-2xl font-bold text-gray-800">Aviso Legal</h2>

        <p className="text-gray-600">
          O UFMG Salas é um projeto independente, mantido por estudantes, sem
          qualquer vínculo oficial, patrocínio ou endosso da Universidade
          Federal de Minas Gerais (UFMG). Nomes e marcas da UFMG aparecem aqui
          apenas para fins de identificação e referência.
        </p>

        <p className="text-gray-600">
          Este projeto é open source: o código-fonte completo está disponível
          publicamente em{" "}
          <a
            href="https://github.com/fidelis05/UFMG-Salas"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D44A61] font-medium hover:underline"
          >
            github.com/fidelis05/UFMG-Salas
          </a>
          . Qualquer pessoa pode auditar o código e verificar exatamente como
          seus dados são tratados.
        </p>

        <p className="text-gray-600">
          A ferramenta reúne informações de alocação de salas divulgadas
          publicamente pelos institutos e escolas da UFMG, além da grade de
          horários do próprio usuário, obtida diretamente dos sistemas oficiais
          da universidade mediante login do estudante.
        </p>

        <p className="text-gray-600">
          Ao fazer login, seu usuário e senha são enviados diretamente para o
          sistema oficial da UFMG para autenticação — não armazenamos suas
          credenciais em nenhum momento. Apenas o token de sessão retornado pela
          universidade é mantido para manter você conectado.
        </p>

        <p className="text-gray-600">
          Aplicamos uma política de zero log na nossa infraestrutura na
          Cloudflare: a coleta e retenção de logs de requisições fica
          desativada, então nenhum dado de acesso (usuário, IP, conteúdo das
          requisições) é armazenado pela plataforma.
        </p>

        <p className="text-gray-600">
          As informações de salas e horários podem estar desatualizadas,
          incompletas ou incorretas. Sempre confirme dados importantes (como
          sala e horário de provas) diretamente na secretaria do seu curso ou
          nos sistemas oficiais da UFMG antes de tomar decisões.
        </p>

        <p className="text-gray-600">
          O uso desta ferramenta é de inteira responsabilidade do usuário. Não
          nos responsabilizamos por danos, prejuízos ou transtornos decorrentes
          de informações desatualizadas, indisponibilidade do serviço ou uso
          indevido dos dados aqui apresentados.
        </p>
      </div>
    </div>
  );
};

export default Disclaimer;
