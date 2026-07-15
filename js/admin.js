// Controla autenticação simples e CRUD das publicações no CRM.
const AdminApp = (() => {
  const config = window.APP_CONFIG;
  const loginView = document.getElementById("login-view");
  const crmView = document.getElementById("crm-view");
  const loginForm = document.getElementById("login-form");
  const postForm = document.getElementById("post-form");
  const listElement = document.getElementById("admin-posts-list");
  const messageElement = document.getElementById("form-message");
  const imageInput = document.getElementById("post-image");
  const fileInput = document.getElementById("post-image-file");
  const imagePreview = document.getElementById("image-preview");
  const videoPreview = document.getElementById("video-preview");
  const postImageActions = document.getElementById("post-image-actions");
  const removePostImageButton = document.getElementById("remove-post-image");
  const propertyForm = document.getElementById("property-form");
  const propertyListElement = document.getElementById("admin-properties-list");
  const propertyImagesInput = document.getElementById("property-images");
  const propertyFilesInput = document.getElementById("property-image-files");
  const propertyPreview = document.getElementById("property-upload-preview");
  const propertyMessageElement = document.getElementById("property-form-message");
  const pageTitle = document.getElementById("crm-page-title");
  const tabLinks = [...document.querySelectorAll("[data-crm-tab]")];
  const panels = [...document.querySelectorAll("[data-crm-panel]")];
  const siteLinks = [...document.querySelectorAll("[data-site-link]")];
  const postsPanel = document.getElementById("editor");
  const propertiesPanel = document.getElementById("property-editor");
  const backPostsButton = document.getElementById("back-posts");
  const backPropertiesButton = document.getElementById("back-properties");

  let currentPosts = [];
  let currentProperties = [];
  let activePostEditId = "";
  let activePropertyEditId = "";

  const panelTitles = {
    dashboard: "Dashboard",
    editor: "Publicações do Blog",
    "property-editor": "Imóveis",
    "flyer-editor": "Criar Panfleto"
  };

  // Abre ou fecha o formulário de publicação e ajusta o texto do botão.
  function setPostFormOpen(isOpen) {
    postForm.classList.toggle("form-collapsed", !isOpen);
    const buttonLabel = document.getElementById("clear-form");
    buttonLabel.innerHTML = isOpen ? '<i data-lucide="x"></i> Fechar' : '<i data-lucide="plus"></i> Novo';
    lucide.createIcons();
  }

  // Abre ou fecha o formulário de imóvel e ajusta o texto do botão.
  function setPropertyFormOpen(isOpen) {
    propertyForm.classList.toggle("form-collapsed", !isOpen);
    const buttonLabel = document.getElementById("clear-property-form");
    buttonLabel.innerHTML = isOpen ? '<i data-lucide="x"></i> Fechar' : '<i data-lucide="plus"></i> Novo';
    lucide.createIcons();
  }

  // Identifica se uma mídia salva é vídeo pelo tipo base64 ou extensão.
  function isVideoMedia(media) {
    return String(media || "").startsWith("data:video") || /\.(mp4|webm|ogg)$/i.test(String(media || ""));
  }

  // Monta o HTML correto para exibir imagem ou vídeo em cards administrativos.
  function createMediaMarkup(media, altText, className = "") {
    if (isVideoMedia(media)) {
      return `<video class="${className}" src="${media}" controls muted playsinline preload="metadata" aria-label="${altText}"></video>`;
    }

    return `<img class="${className}" src="${media}" alt="${altText}">`;
  }

  // Lê qualquer arquivo selecionado e retorna em formato base64.
  function readFileAsDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  // Tenta comprimir vídeos no navegador usando canvas e MediaRecorder para reduzir peso.
  async function compressVideoFile(file) {
    if (!file.type.startsWith("video/") || !window.MediaRecorder) {
      return readFileAsDataUrl(file);
    }

    try {
      const video = document.createElement("video");
      const sourceUrl = URL.createObjectURL(file);
      video.src = sourceUrl;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(320, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(240, Math.round(video.videoHeight * scale));
      const context = canvas.getContext("2d");
      const stream = canvas.captureStream(24);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 900000 });
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };

      const finished = new Promise((resolve) => {
        recorder.onstop = resolve;
      });

      recorder.start();
      await video.play();

      await new Promise((resolve) => {
        const drawFrame = () => {
          if (video.ended || video.paused) {
            resolve();
            return;
          }

          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        };

        drawFrame();
      });

      recorder.stop();
      await finished;
      URL.revokeObjectURL(sourceUrl);

      const blob = new Blob(chunks, { type: "video/webm" });
      if (!blob.size || blob.size > file.size) return readFileAsDataUrl(file);

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      return readFileAsDataUrl(file);
    }
  }

  // Alterna a interface entre tela de login e painel principal.
  function setLoggedState(isLogged) {
    loginView.classList.toggle("hidden", isLogged);
    crmView.classList.toggle("hidden", !isLogged);
  }

  // Exibe uma tela do CRM por vez, mantendo o menu lateral como navegação principal.
  function showPanel(panelId) {
    if (panelId !== "editor") exitPostEditMode(false);
    if (panelId !== "property-editor") exitPropertyEditMode(false);

    panels.forEach((panel) => panel.classList.toggle("hidden", panel.dataset.crmPanel !== panelId));
    panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.crmPanel === panelId));
    tabLinks.forEach((link) => link.classList.toggle("active", link.dataset.crmTab === panelId));
    pageTitle.textContent = panelTitles[panelId] || "Dashboard";
    if (panelId === "editor" && !activePostEditId) setPostFormOpen(false);
    if (panelId === "property-editor" && !activePropertyEditId) setPropertyFormOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Configura os links do menu lateral e mantém o link do site atualizado.
  function setupSidebarNavigation() {
    siteLinks.forEach((link) => {
      link.href = config.SITE_URL || "https://site-teste-mauve.vercel.app";
    });

    tabLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showPanel(link.dataset.crmTab);
      });
    });
  }

  // Valida as credenciais solicitadas.
  function setupLogin() {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;
      const message = document.getElementById("login-message");

      try {
        message.textContent = "Entrando...";
        await SupabaseAuth.signIn(username, password);
        message.textContent = "";
        setLoggedState(true);
        await renderAdmin();
        await renderPropertiesAdmin();
        showPanel("dashboard");
        return;
      } catch (error) {
        message.textContent = "Não foi possível entrar. Confira o e-mail, a senha e a configuração do Supabase.";
      }
    });

    document.getElementById("logout-button").addEventListener("click", async () => {
      await SupabaseAuth.signOut();
      setLoggedState(false);
    });
  }

  // Formata datas do banco para exibição em padrão brasileiro.
  function formatDate(dateValue) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(dateValue));
  }

  // Exibe a prévia da mídia da publicação, seja imagem ou vídeo.
  function showPostImage(media) {
    imageInput.value = media;
    imagePreview.classList.toggle("hidden", isVideoMedia(media));
    videoPreview.classList.toggle("hidden", !isVideoMedia(media));

    if (isVideoMedia(media)) {
      videoPreview.src = media;
      imagePreview.removeAttribute("src");
    } else {
      imagePreview.src = media;
      videoPreview.removeAttribute("src");
    }

    postImageActions.classList.remove("hidden");
  }

  // Remove a mídia atual da publicação em edição ou cadastro.
  function removePostImage() {
    imageInput.value = "";
    fileInput.value = "";
    imagePreview.removeAttribute("src");
    videoPreview.removeAttribute("src");
    imagePreview.classList.add("hidden");
    videoPreview.classList.add("hidden");
    postImageActions.classList.add("hidden");
    messageElement.style.color = "var(--muted)";
    messageElement.textContent = "Mídia removida. Importe uma nova mídia antes de salvar.";
  }

  // Configura o campo de upload de mídia da publicação.
  function setupImageUpload() {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;

      messageElement.style.color = "var(--muted)";
      messageElement.textContent = file.type.startsWith("video/") ? "Otimizando vídeo..." : "";
      showPostImage(await compressVideoFile(file));
      messageElement.textContent = "";
    });

    removePostImageButton.addEventListener("click", removePostImage);
  }

  // Lê múltiplas fotos ou vídeos do imóvel para montar o carrossel exibido no site.
  function setupPropertyImageUpload() {
    propertyFilesInput.addEventListener("change", async () => {
      const files = [...propertyFilesInput.files];
      if (!files.length) return;

      propertyMessageElement.style.color = "var(--muted)";
      propertyMessageElement.textContent = files.some((file) => file.type.startsWith("video/")) ? "Otimizando vídeos..." : "";
      const images = await Promise.all(files.map((file) => compressVideoFile(file)));

      propertyImagesInput.value = JSON.stringify(images);
      renderPropertyPreview(images);
      propertyMessageElement.textContent = "";
    });
  }

  // Renderiza as miniaturas das fotos ou vídeos do imóvel com botões de remoção.
  function renderPropertyPreview(images) {
    propertyPreview.innerHTML = images.map((image, index) => `
      <div class="property-preview-item">
        ${createMediaMarkup(image, `Prévia ${index + 1} do imóvel`)}
        <button class="remove-property-image" type="button" data-remove-property-image="${index}" aria-label="Excluir mídia ${index + 1}">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `).join("");
    lucide.createIcons();
  }

  // Permite remover mídias específicas da lista de imagens ou vídeos do imóvel.
  function setupPropertyPreviewActions() {
    propertyPreview.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-property-image]");
      if (!removeButton) return;

      const images = JSON.parse(propertyImagesInput.value || "[]");
      images.splice(Number(removeButton.dataset.removePropertyImage), 1);
      propertyImagesInput.value = JSON.stringify(images);
      propertyFilesInput.value = "";
      renderPropertyPreview(images);

      propertyMessageElement.style.color = images.length ? "var(--muted)" : "var(--danger)";
      propertyMessageElement.textContent = images.length
        ? "Mídia removida. Salve o imóvel para confirmar a alteração."
        : "Todas as mídias foram removidas. Importe ao menos uma imagem ou vídeo antes de salvar.";
    });
  }

  // Preenche o formulário para edição de uma publicação existente.
  function fillForm(post) {
    activePostEditId = post.id;
    document.getElementById("post-id").value = post.id;
    showPostImage(post.image);
    document.getElementById("post-title").value = post.title;
    document.getElementById("post-content").value = post.content;
    document.getElementById("post-link").value = post.link_url || "";
    document.getElementById("form-heading").textContent = "Editar publicação";
    messageElement.textContent = "";
    postsPanel.classList.add("editing-mode");
    setPostFormOpen(true);
    backPostsButton.classList.remove("hidden");
    listElement.innerHTML = "";
    listElement.appendChild(createAdminPost(post, true));
    window.scrollTo({ top: 0, behavior: "smooth" });
    lucide.createIcons();
  }

  // Limpa o formulário para iniciar uma nova publicação.
  function clearForm() {
    activePostEditId = "";
    postForm.reset();
    document.getElementById("post-id").value = "";
    imageInput.value = "";
    fileInput.value = "";
    imagePreview.removeAttribute("src");
    videoPreview.removeAttribute("src");
    imagePreview.classList.add("hidden");
    videoPreview.classList.add("hidden");
    postImageActions.classList.add("hidden");
    document.getElementById("form-heading").textContent = "Nova publicação";
    messageElement.textContent = "";
    postsPanel.classList.remove("editing-mode");
    backPostsButton.classList.add("hidden");
  }

  // Fecha o modo de edição de publicação e recarrega a listagem quando necessário.
  async function exitPostEditMode(shouldRender = true) {
    activePostEditId = "";
    clearForm();
    if (shouldRender) {
      await renderAdmin();
      showPanel("editor");
    }
  }

  // Atualiza os indicadores do dashboard com posts, imóveis e última atualização.
  function updateDashboard(posts) {
    const lastPostDate = posts[0]?.created_at;
    const lastPropertyDate = currentProperties[0]?.created_at;
    const latestDate = [lastPostDate, lastPropertyDate]
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];

    document.getElementById("total-posts").textContent = posts.length;
    document.getElementById("total-properties").textContent = currentProperties.length;
    document.getElementById("storage-status").textContent = BlogStorage.hasSupabaseConfig() ? "Supabase" : "Local";
    document.getElementById("last-update").textContent = latestDate ? formatDate(latestDate) : "Sem dados";
  }

  // Cria o card administrativo de uma publicação do blog.
  function createAdminPost(post, isFocused = false) {
    const row = document.createElement("article");
    row.className = "admin-post blog-card";
    row.innerHTML = `
      ${createMediaMarkup(post.image, post.title)}
      <div class="blog-card-content">
        <h3>${post.title}</h3>
        <p>${post.content}</p>
        <div class="blog-meta">
          <time datetime="${post.created_at}">
            <i data-lucide="calendar-clock"></i>
            ${formatDate(post.created_at)}
          </time>
          <a class="button button-light" href="${post.link_url || "#"}" target="_blank" rel="noopener">Saiba mais</a>
        </div>
        <div class="admin-actions">
          <button class="button button-light ${isFocused ? "hidden" : ""}" type="button" data-edit="${post.id}">
            <i data-lucide="pencil"></i> Editar
          </button>
          <button class="button button-danger" type="button" data-delete="${post.id}">
            <i data-lucide="trash-2"></i> Excluir
          </button>
        </div>
      </div>
    `;
    return row;
  }

  // Carrega e exibe as publicações cadastradas no CRM.
  async function renderAdmin() {
    currentPosts = await BlogStorage.listPosts();
    listElement.innerHTML = "";

    if (activePostEditId) {
      const selectedPost = currentPosts.find((post) => post.id === activePostEditId);
      if (selectedPost) {
        listElement.appendChild(createAdminPost(selectedPost, true));
        updateDashboard(currentPosts);
        lucide.createIcons();
        return;
      }
      clearForm();
    }

    if (!currentPosts.length) {
      listElement.innerHTML = '<p class="empty-posts">Nenhuma publicação cadastrada.</p>';
    } else {
      currentPosts.forEach((post) => listElement.appendChild(createAdminPost(post)));
    }

    updateDashboard(currentPosts);
    lucide.createIcons();
  }

  // Preenche o formulário para editar um imóvel já cadastrado.
  function fillPropertyForm(property) {
    activePropertyEditId = property.id;
    document.getElementById("property-id").value = property.id;
    document.getElementById("property-title").value = property.title;
    document.getElementById("property-status").value = property.status;
    document.getElementById("property-address").value = property.address;
    document.getElementById("property-neighborhood").value = property.neighborhood;
    document.getElementById("property-city").value = property.city;
    propertyImagesInput.value = JSON.stringify(property.images || []);
    renderPropertyPreview(property.images || []);
    document.getElementById("property-form-heading").textContent = "Editar imóvel";
    propertyMessageElement.textContent = "";
    propertiesPanel.classList.add("editing-mode");
    setPropertyFormOpen(true);
    backPropertiesButton.classList.remove("hidden");
    propertyListElement.innerHTML = "";
    propertyListElement.appendChild(createAdminProperty(property, true));
    showPanel("property-editor");
    document.getElementById("property-editor").scrollIntoView({ behavior: "smooth", block: "start" });
    lucide.createIcons();
  }

  // Limpa o formulário de imóveis e sai do modo de edição.
  function clearPropertyForm() {
    activePropertyEditId = "";
    propertyForm.reset();
    document.getElementById("property-id").value = "";
    propertyImagesInput.value = "";
    propertyFilesInput.value = "";
    propertyPreview.innerHTML = "";
    document.getElementById("property-form-heading").textContent = "Novo imóvel";
    propertyMessageElement.textContent = "";
    propertiesPanel.classList.remove("editing-mode");
    backPropertiesButton.classList.add("hidden");
  }

  // Fecha o modo de edição de imóvel e recarrega a listagem quando necessário.
  async function exitPropertyEditMode(shouldRender = true) {
    activePropertyEditId = "";
    clearPropertyForm();
    if (shouldRender) {
      await renderPropertiesAdmin();
      showPanel("property-editor");
    }
  }

  // Cria o card administrativo de um imóvel cadastrado.
  function createAdminProperty(property, isFocused = false) {
    const row = document.createElement("article");
    row.className = "admin-property";
    row.innerHTML = `
      ${createMediaMarkup(property.images[0], property.title)}
      <div class="admin-property-content">
        <span class="property-status">${property.status}</span>
        <h3>${property.title}</h3>
        <p>${property.address}</p>
        <p>${property.neighborhood} - ${property.city}</p>
        <div class="admin-actions">
          <button class="button button-light ${isFocused ? "hidden" : ""}" type="button" data-property-edit="${property.id}">
            <i data-lucide="pencil"></i> Editar
          </button>
          <button class="button button-danger" type="button" data-property-delete="${property.id}">
            <i data-lucide="trash-2"></i> Excluir
          </button>
        </div>
      </div>
    `;
    return row;
  }

  // Carrega e exibe os imóveis cadastrados no CRM.
  async function renderPropertiesAdmin() {
    currentProperties = await PropertyStorage.listProperties();
    propertyListElement.innerHTML = "";

    if (activePropertyEditId) {
      const selectedProperty = currentProperties.find((property) => property.id === activePropertyEditId);
      if (selectedProperty) {
        propertyListElement.appendChild(createAdminProperty(selectedProperty, true));
        updateDashboard(currentPosts);
        lucide.createIcons();
        return;
      }
      clearPropertyForm();
    }

    if (!currentProperties.length) {
      propertyListElement.innerHTML = '<p class="empty-posts">Nenhum imóvel cadastrado.</p>';
    } else {
      currentProperties.forEach((property) => propertyListElement.appendChild(createAdminProperty(property)));
    }

    updateDashboard(currentPosts);
    lucide.createIcons();
  }

  // Centraliza os cliques de editar e excluir para manter o código menor e reutilizável.
  function setupPostActions() {
    listElement.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-edit]");
      const deleteButton = event.target.closest("[data-delete]");

      if (editButton) {
        const post = currentPosts.find((item) => item.id === editButton.dataset.edit);
        if (post) fillForm(post);
      }

      if (deleteButton) {
        const confirmDelete = confirm("Deseja excluir esta publicação?");
        if (!confirmDelete) return;

        await BlogStorage.deletePost(deleteButton.dataset.delete);
        clearForm();
        renderAdmin();
      }
    });
  }

  // Centraliza os cliques de editar e excluir imóveis.
  function setupPropertyActions() {
    propertyListElement.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-property-edit]");
      const deleteButton = event.target.closest("[data-property-delete]");

      if (editButton) {
        const property = currentProperties.find((item) => item.id === editButton.dataset.propertyEdit);
        if (property) fillPropertyForm(property);
      }

      if (deleteButton) {
        const confirmDelete = confirm("Deseja excluir este imóvel?");
        if (!confirmDelete) return;

        await PropertyStorage.deleteProperty(deleteButton.dataset.propertyDelete);
        clearPropertyForm();
        renderPropertiesAdmin();
      }
    });
  }

  // Configura o formulário de criação e edição de publicações.
  function setupForm() {
    postForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!imageInput.value) {
        messageElement.style.color = "var(--danger)";
        messageElement.textContent = "Importe uma imagem antes de salvar.";
        return;
      }

      const id = document.getElementById("post-id").value;
      const post = {
        image: imageInput.value,
        title: document.getElementById("post-title").value.trim(),
        content: document.getElementById("post-content").value.trim(),
        link_url: document.getElementById("post-link").value.trim()
      };

      try {
        if (id) {
          await BlogStorage.updatePost(id, post);
          messageElement.style.color = "var(--brand)";
          messageElement.textContent = "Publicação atualizada com sucesso.";
        } else {
          await BlogStorage.createPost(post);
          messageElement.style.color = "var(--brand)";
          messageElement.textContent = "Publicação adicionada com sucesso.";
        }

        await exitPostEditMode(true);
      } catch (error) {
        messageElement.style.color = "var(--danger)";
        messageElement.textContent = "Não foi possível salvar a publicação.";
      }
    });

    document.getElementById("clear-form").addEventListener("click", async () => {
      const shouldOpen = postForm.classList.contains("form-collapsed");
      clearForm();
      setPostFormOpen(shouldOpen);
      if (!shouldOpen) await renderAdmin();
    });
    backPostsButton.addEventListener("click", () => exitPostEditMode(true));
    document.getElementById("refresh-posts").addEventListener("click", renderAdmin);
  }

  // Configura o formulário de criação e edição de imóveis.
  function setupPropertyForm() {
    propertyForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const images = JSON.parse(propertyImagesInput.value || "[]");

      if (!images.length) {
        propertyMessageElement.style.color = "var(--danger)";
        propertyMessageElement.textContent = "Importe ao menos uma imagem ou vídeo do imóvel.";
        return;
      }

      const id = document.getElementById("property-id").value;
      const property = {
        title: document.getElementById("property-title").value.trim(),
        status: document.getElementById("property-status").value,
        address: document.getElementById("property-address").value.trim(),
        neighborhood: document.getElementById("property-neighborhood").value.trim(),
        city: document.getElementById("property-city").value.trim(),
        learn_more_url: config.DEFAULT_PROPERTY_LINK,
        images
      };

      try {
        if (id) {
          await PropertyStorage.updateProperty(id, property);
          propertyMessageElement.style.color = "var(--brand)";
          propertyMessageElement.textContent = "Imóvel atualizado com sucesso.";
        } else {
          await PropertyStorage.createProperty(property);
          propertyMessageElement.style.color = "var(--brand)";
          propertyMessageElement.textContent = "Imóvel cadastrado com sucesso.";
        }

        await exitPropertyEditMode(true);
      } catch (error) {
        propertyMessageElement.style.color = "var(--danger)";
        propertyMessageElement.textContent = "Não foi possível salvar o imóvel.";
      }
    });

    document.getElementById("clear-property-form").addEventListener("click", async () => {
      const shouldOpen = propertyForm.classList.contains("form-collapsed");
      clearPropertyForm();
      setPropertyFormOpen(shouldOpen);
      if (!shouldOpen) await renderPropertiesAdmin();
    });
    backPropertiesButton.addEventListener("click", () => exitPropertyEditMode(true));
    document.getElementById("refresh-properties").addEventListener("click", renderPropertiesAdmin);
  }

  // Inicializa autenticação, eventos, dados e estado inicial do CRM.
  async function init() {
    setupLogin();
    setupSidebarNavigation();
    setupImageUpload();
    setupPropertyImageUpload();
    setupPropertyPreviewActions();
    setupForm();
    setupPropertyForm();
    setupPostActions();
    setupPropertyActions();
    setPostFormOpen(false);
    setPropertyFormOpen(false);
    const session = await SupabaseAuth.getSession();
    setLoggedState(Boolean(session));

    if (session) {
      await renderAdmin();
      await renderPropertiesAdmin();
      showPanel("dashboard");
    }

    lucide.createIcons();
  }

  return { init };
})();

AdminApp.init();
