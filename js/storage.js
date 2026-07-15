// Integração de autenticação com Supabase Auth usada apenas pelo CRM.
// O site público continua lendo os dados com a chave anon, enquanto o CRM escreve com o token do usuário logado.
const SupabaseAuth = (() => {
  const config = window.APP_CONFIG;
  let client = null;

  // Verifica se as credenciais do Supabase e a biblioteca estão disponíveis.
  function isConfigured() {
    return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && window.supabase);
  }

  // Cria ou reutiliza a instância do cliente Supabase.
  function getClient() {
    if (!isConfigured()) return null;

    if (!client) {
      client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    }

    return client;
  }

  // Faz login do usuário usando Supabase Auth.
  async function signIn(email, password) {
    const supabaseClient = getClient();

    if (!supabaseClient) {
      throw new Error("Configure o Supabase antes de acessar o CRM.");
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }

    return data.session;
  }

  // Encerra a sessão atual no Supabase Auth.
  async function signOut() {
    const supabaseClient = getClient();
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
  }

  // Busca a sessão atual do usuário autenticado.
  async function getSession() {
    const supabaseClient = getClient();
    if (!supabaseClient) return null;
    const { data } = await supabaseClient.auth.getSession();
    return data.session;
  }

  // Retorna o token de acesso usado nas permissões de escrita.
  async function getAccessToken() {
    const session = await getSession();
    return session?.access_token || "";
  }

  return {
    isConfigured,
    signIn,
    signOut,
    getSession,
    getAccessToken
  };
})();

// Camada de dados do blog.
// Usa Supabase quando as chaves estão configuradas e localStorage como alternativa para testes locais.
const BlogStorage = (() => {
  const config = window.APP_CONFIG;
  const localKey = "grupo_gomes_blog_posts_v2";

  const seedPosts = [
    {
      id: crypto.randomUUID(),
      image: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=900&q=80",
      title: "Atendimento integrado para empresas em Belém",
      content: "O grupo reúne documentação, contabilidade, certificação digital e seguros para simplificar a rotina de empresas que precisam de agilidade.",
      link_url: "https://site-teste-mauve.vercel.app/",
      created_at: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80",
      title: "Soluções imobiliárias com suporte completo",
      content: "Compra, venda, aluguel e regularização de imóveis contam com acompanhamento consultivo para reduzir burocracias e dar mais segurança.",
      link_url: "https://site-teste-mauve.vercel.app/",
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: crypto.randomUUID(),
      image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=80",
      title: "Saúde e proteção para famílias",
      content: "Planos de saúde, odontológicos, seguros e proteção familiar ajudam clientes a cuidar do presente com planejamento e confiança.",
      link_url: "https://site-teste-mauve.vercel.app/",
      created_at: new Date(Date.now() - 172800000).toISOString()
    }
  ];

  // Confere se o projeto deve usar Supabase ou apenas armazenamento local.
  function hasSupabaseConfig() {
    return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
  }

  // Monta as chamadas REST da API automática do Supabase.
  async function supabaseRequest(path, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const accessToken = method === "GET" ? "" : await SupabaseAuth.getAccessToken();

    const response = await fetch(`${config.SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: config.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken || config.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error("Não foi possível comunicar com o Supabase.");
    }

    return response.status === 204 ? [] : response.json();
  }

  // Garante posts iniciais para demonstração quando ainda não há banco configurado.
  function getLocalPosts() {
    const savedPosts = JSON.parse(localStorage.getItem(localKey) || "null");

    if (Array.isArray(savedPosts)) {
      return savedPosts;
    }

    localStorage.setItem(localKey, JSON.stringify(seedPosts));
    return seedPosts;
  }

  // Atualiza a lista local inteira quando o projeto está em modo de testes.
  function setLocalPosts(posts) {
    localStorage.setItem(localKey, JSON.stringify(posts));
  }

  // Lista publicações do blog vindas do Supabase ou do armazenamento local.
  async function listPosts() {
    if (hasSupabaseConfig()) {
      return supabaseRequest(`${config.TABLE_NAME}?select=*&order=created_at.desc`);
    }

    return getLocalPosts().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // Cria uma nova publicação no Supabase ou no armazenamento local.
  async function createPost(post) {
    const payload = {
      id: crypto.randomUUID(),
      ...post,
      created_at: new Date().toISOString()
    };

    if (hasSupabaseConfig()) {
      const rows = await supabaseRequest(config.TABLE_NAME, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      return rows[0];
    }

    const posts = [payload, ...getLocalPosts()];
    setLocalPosts(posts);
    return payload;
  }

  // Atualiza uma publicação existente pelo id informado.
  async function updatePost(id, post) {
    if (hasSupabaseConfig()) {
      const rows = await supabaseRequest(`${config.TABLE_NAME}?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify(post)
      });
      return rows[0];
    }

    const posts = getLocalPosts().map((item) => item.id === id ? { ...item, ...post } : item);
    setLocalPosts(posts);
    return posts.find((item) => item.id === id);
  }

  // Remove uma publicação pelo id informado.
  async function deletePost(id) {
    if (hasSupabaseConfig()) {
      await supabaseRequest(`${config.TABLE_NAME}?id=eq.${id}`, { method: "DELETE" });
      return;
    }

    setLocalPosts(getLocalPosts().filter((item) => item.id !== id));
  }

  return {
    listPosts,
    createPost,
    updatePost,
    deletePost,
    hasSupabaseConfig
  };
})();

// Camada de dados dos imóveis exibidos na seção Imobiliária.
// Usa Supabase quando configurado e localStorage como fallback para testes e hospedagem estática.
const PropertyStorage = (() => {
  const config = window.APP_CONFIG;
  const localKey = "grupo_gomes_real_estate_properties_v1";

  const seedProperties = [
    {
      id: crypto.randomUUID(),
      title: "Casa residencial com amplo quintal",
      status: "Disponível para venda",
      address: "Travessa Vileta, 1414",
      neighborhood: "Marco",
      city: "Belém - PA",
      learn_more_url: "https://gomeserosiane.com.br",
      images: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=80"
      ],
      created_at: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      title: "Apartamento compacto para locação",
      status: "Disponível para alugar",
      address: "Av. Almirante Barroso, 2200",
      neighborhood: "Souza",
      city: "Belém - PA",
      learn_more_url: "https://gomeserosiane.com.br",
      images: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=1000&q=80"
      ],
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: crypto.randomUUID(),
      title: "Sala comercial em região estratégica",
      status: "Imóvel alugado",
      address: "Rua dos Mundurucus, 900",
      neighborhood: "Batista Campos",
      city: "Belém - PA",
      learn_more_url: "https://gomeserosiane.com.br",
      images: [
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80"
      ],
      created_at: new Date(Date.now() - 172800000).toISOString()
    }
  ];

  // Confere se os imóveis devem usar Supabase ou fallback local.
  function hasSupabaseConfig() {
    return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
  }

  // Monta uma requisição REST para a tabela de imóveis no Supabase.
  async function supabaseRequest(path, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const accessToken = method === "GET" ? "" : await SupabaseAuth.getAccessToken();

    const response = await fetch(`${config.SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: config.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken || config.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error("Não foi possível comunicar com o Supabase.");
    }

    return response.status === 204 ? [] : response.json();
  }

  // Carrega imóveis do localStorage ou cria dados iniciais de demonstração.
  function getLocalProperties() {
    const savedProperties = JSON.parse(localStorage.getItem(localKey) || "null");

    if (Array.isArray(savedProperties)) {
      return savedProperties;
    }

    localStorage.setItem(localKey, JSON.stringify(seedProperties));
    return seedProperties;
  }

  // Salva a lista completa de imóveis no localStorage.
  function setLocalProperties(properties) {
    localStorage.setItem(localKey, JSON.stringify(properties));
  }

  // Garante que o campo de imagens do imóvel esteja sempre como lista.
  function normalizeProperty(property) {
    return {
      ...property,
      images: Array.isArray(property.images)
        ? property.images
        : String(property.images || "").split("\n").map((item) => item.trim()).filter(Boolean)
    };
  }

  // Lista imóveis cadastrados a partir do Supabase ou do localStorage.
  async function listProperties() {
    if (hasSupabaseConfig()) {
      const rows = await supabaseRequest(`${config.PROPERTY_TABLE_NAME}?select=*&order=created_at.desc`);
      return rows.map(normalizeProperty);
    }

    return getLocalProperties()
      .map(normalizeProperty)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // Cria um novo imóvel no Supabase ou no armazenamento local.
  async function createProperty(property) {
    const payload = {
      id: crypto.randomUUID(),
      ...property,
      created_at: new Date().toISOString()
    };

    if (hasSupabaseConfig()) {
      const rows = await supabaseRequest(config.PROPERTY_TABLE_NAME, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      return normalizeProperty(rows[0]);
    }

    const properties = [payload, ...getLocalProperties()];
    setLocalProperties(properties);
    return payload;
  }

  // Atualiza um imóvel existente pelo id informado.
  async function updateProperty(id, property) {
    if (hasSupabaseConfig()) {
      const rows = await supabaseRequest(`${config.PROPERTY_TABLE_NAME}?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify(property)
      });
      return normalizeProperty(rows[0]);
    }

    const properties = getLocalProperties().map((item) => item.id === id ? { ...item, ...property } : item);
    setLocalProperties(properties);
    return properties.find((item) => item.id === id);
  }

  // Remove um imóvel pelo id informado.
  async function deleteProperty(id) {
    if (hasSupabaseConfig()) {
      await supabaseRequest(`${config.PROPERTY_TABLE_NAME}?id=eq.${id}`, { method: "DELETE" });
      return;
    }

    setLocalProperties(getLocalProperties().filter((item) => item.id !== id));
  }

  return {
    listProperties,
    createProperty,
    updateProperty,
    deleteProperty
  };
})();

