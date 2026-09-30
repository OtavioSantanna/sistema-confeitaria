import { useCallback, useEffect, useState } from 'react';

// Carrega dados de uma função async e expõe { dados, carregando, erro, recarregar }.
export function useCarregar(fn, deps = []) {
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const carregar = useCallback(fn, deps);

  const recarregar = useCallback(async () => {
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    try {
      const dados = await carregar();
      setEstado({ dados, carregando: false, erro: null });
    } catch (erro) {
      setEstado({ dados: null, carregando: false, erro });
    }
  }, [carregar]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { ...estado, recarregar, setDados: (dados) => setEstado((e) => ({ ...e, dados })) };
}
