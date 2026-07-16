// Controla exclusivamente a seção "Criar Panfleto" do CRM.
const FormCreator = (() => {
  const flyerForm = document.getElementById("flyer-form");
  const flyerCanvas = document.getElementById("flyer-canvas");
  const consultantSelectWrap = document.getElementById("flyer-consultant-select-wrap");
  const flyerFields = {
    colorMode: document.getElementById("flyer-color-mode"),
    primary: document.getElementById("flyer-color-primary"),
    secondary: document.getElementById("flyer-color-secondary"),
    title: document.getElementById("flyer-title"),
    consultant: document.getElementById("flyer-consultant"),
    name: document.getElementById("flyer-name"),
    company: document.getElementById("flyer-company"),
    phone: document.getElementById("flyer-phone")
  };
  const flyerConsultantRadios = [...document.querySelectorAll("input[name='flyer-consultant-enabled']")];

  const flyerTitles = {
    imobiliaria: {
      label: "Imobiliária",
      logo: "assets/panfletos/logos/logo-adm.png",
      paragraphs: [
        "Compra, venda e aluguel de imóveis.",
        "Administração imobiliária com suporte.",
        "Avaliação e divulgação do seu imóvel.",
        "Regularização e análise documental.",
        "Atendimento consultivo em Belém e região.",
        "Mais segurança para negociar."
      ]
    },
    otica: {
      label: "Ótica",
      logo: "assets/panfletos/logos/logo-otica.png",
      paragraphs: [
        "Armações modernas para todos os estilos.",
        "Óculos de grau e óculos de sol.",
        "Orientação para escolha de lentes.",
        "Conforto visual para sua rotina.",
        "Atendimento personalizado.",
        "Qualidade, praticidade e bom gosto."
      ]
    },
    planos: {
      label: "Planos de saúde",
      logo: "assets/panfletos/logos/logo-adm.png",
      paragraphs: [
        "Planos de saúde para famílias.",
        "Opções para empresas e colaboradores.",
        "Planos odontológicos e benefícios.",
        "Orientação antes da contratação.",
        "Análise de perfil e necessidade.",
        "Mais cuidado e previsibilidade."
      ]
    },
    odontologia: {
      label: "Odontologia",
      logo: "assets/panfletos/logos/logo-adm.png",
      paragraphs: [
        "Cuidado odontológico acessível.",
        "Planos para prevenção e tratamento.",
        "Atendimento para famílias e empresas.",
        "Orientação sobre coberturas.",
        "Mais tranquilidade para sorrir.",
        "Saúde bucal com acompanhamento."
      ]
    },
    seguro: {
      label: "Seguro de vida",
      logo: "assets/panfletos/logos/logo-adm.png",
      paragraphs: [
        "Proteção financeira para sua família.",
        "Coberturas conforme seu perfil.",
        "Orientação clara sobre benefícios.",
        "Planejamento para imprevistos.",
        "Mais segurança para o futuro.",
        "Atendimento responsável e próximo."
      ]
    },
    funeraria: {
      label: "Funerária",
      logo: "assets/panfletos/logos/logo-funeraria.png",
      paragraphs: [
        "Planos funerários individuais.",
        "Assistência para toda a família.",
        "Acolhimento em momentos delicados.",
        "Orientação sobre coberturas.",
        "Planejamento com responsabilidade.",
        "Atendimento humanizado."
      ]
    }
  };

  const flyerAssets = {
    consultants: {
      "consultor-1": "assets/panfletos/consultores/consultor-1.png",
      "consultor-2": "assets/panfletos/consultores/consultor-2.png",
      "consultor-3": "assets/panfletos/consultores/consultor-3.png",
      "consultor-4": "assets/panfletos/consultores/consultor-4.png"
    }
  };

  // Carrega uma imagem local antes de desenhá-la no canvas.
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  // Desenha uma imagem inteira dentro de uma área sem cortar ou distorcer.
  function drawContainedImage(context, image, x, y, width, height) {
    const scale = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  // Cria um caminho arredondado para desenhar containers do panfleto.
  function roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  // Divide palavras longas para que nenhuma informação ultrapasse a largura disponível.
  function splitLongWord(context, word, maxWidth) {
    const parts = [];
    let part = "";

    [...String(word)].forEach((character) => {
      const testPart = `${part}${character}`;

      if (context.measureText(testPart).width > maxWidth && part) {
        parts.push(part);
        part = character;
        return;
      }

      part = testPart;
    });

    if (part) parts.push(part);
    return parts;
  }

  // Divide um texto em várias linhas respeitando a largura máxima disponível.
  function getWrappedLines(context, text, maxWidth) {
    const words = String(text).split(" ");
    const lines = [];
    let line = "";

    words.forEach((word) => {
      if (context.measureText(word).width > maxWidth) {
        if (line) {
          lines.push(line);
          line = "";
        }

        lines.push(...splitLongWord(context, word, maxWidth));
        return;
      }

      const testLine = line ? `${line} ${word}` : word;

      if (context.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
        return;
      }

      line = testLine;
    });

    if (line) lines.push(line);
    return lines;
  }

  // Escreve textos do card de contato centralizados em várias linhas, sem cortar com reticências.
  function drawWrappedContactText(context, text, x, y, maxWidth, lineHeight) {
    const lines = getWrappedLines(context, text, maxWidth);

    lines.forEach((line, index) => {
      context.fillText(line, x, y + (index * lineHeight));
    });

    return y + (lines.length * lineHeight);
  }

  // Escreve a lista de parágrafos com quebra de linha natural dentro do container.
  function drawParagraphList(context, paragraphs, x, y, maxWidth, lineHeight, maxLines) {
    let cursorY = y;
    let usedLines = 0;

    paragraphs.some((paragraph) => {
      if (usedLines >= maxLines) return true;

      const lines = getWrappedLines(context, paragraph, maxWidth - 38);
      context.fillText("•", x, cursorY);

      lines.some((line) => {
        if (usedLines >= maxLines) return true;

        context.fillText(line, x + 38, cursorY);
        cursorY += lineHeight;
        usedLines += 1;
        return false;
      });

      cursorY += 7;
      return false;
    });
  }

  // Informa se o ADM escolheu gerar o panfleto com imagem de consultor.
  function isConsultantEnabled() {
    return document.querySelector("input[name='flyer-consultant-enabled']:checked")?.value === "yes";
  }

  // Monta o degradê ou cor única escolhido pelo ADM.
  function createFlyerBackground(context, width, height) {
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, flyerFields.primary.value);
    gradient.addColorStop(1, flyerFields.colorMode.value === "gradient" ? flyerFields.secondary.value : flyerFields.primary.value);
    return gradient;
  }

  // Atualiza a visibilidade da cor secundária e da seleção de consultor.
  function updateFlyerControls() {
    document.querySelector(".flyer-secondary-color").classList.toggle("hidden", flyerFields.colorMode.value !== "gradient");
    consultantSelectWrap.classList.toggle("hidden", !isConsultantEnabled());
  }

  // Desenha a base visual do panfleto usando apenas código.
  function drawFlyerBase(context, width, height, background, textBox) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.save();
    roundedRect(context, textBox.x, textBox.y, textBox.width, textBox.height, textBox.radius);
    context.fillStyle = "rgba(18, 101, 254, 1)";
    context.fill();
    context.restore();
  }

  // Desenha o logotipo relacionado ao título selecionado.
  function drawFlyerLogo(context, logoImage, consultantEnabled) {
    if (consultantEnabled) {
      roundedRect(context, 735, 26, 300, 300, 22);
      context.fillStyle = "";
      context.fill();
      drawContainedImage(context, logoImage, 690, 46, 350, 350);
      return;
    }

    roundedRect(context, 390, 32, 300, 250, 22);
    context.fillStyle = "";
    context.fill();
    drawContainedImage(context, logoImage, 380, 26, 300, 300);
  }

  // Desenha o consultor acima do container azul e atrás do card branco inferior.
  function drawFlyerConsultant(context, consultantImage) {
    if (consultantImage) {
      drawContainedImage(context, consultantImage, 205, 305, 1240, 1240);
    }
  }

  // Desenha o título e os parágrafos dentro do bloco azul do panfleto.
  function drawFlyerTextBlock(context, titleData, textBox) {
    context.fillStyle = "#ffffff";
    context.textBaseline = "top";
    context.textAlign = "center";
    context.font = "900 52px Inter, Arial, sans-serif";
    context.fillText(titleData.label.toUpperCase(), textBox.titleX, textBox.titleY);
    context.textAlign = "left";
    context.font = "400 32px Inter, Arial, sans-serif";
    context.save();
    roundedRect(context, textBox.clipX, textBox.clipY, textBox.clipWidth, textBox.clipHeight, 22);
    context.clip();
    drawParagraphList(context, titleData.paragraphs, textBox.listX, textBox.listY, textBox.listWidth, 47, textBox.maxLines);
    context.restore();
  }

  // Desenha o card branco do canto inferior e preenche nome, empresa e telefone.
  function drawFlyerContactCard(context, consultantEnabled) {
    const name = flyerFields.name.value.trim() || "Nome";
    const company = flyerFields.company.value.trim() || "Empresa";
    const phone = flyerFields.phone.value.trim() || "Telefone";

    context.save();
    if (consultantEnabled) {
      roundedRect(context, 668, 998, 390, 282, 52);
    } else {
      roundedRect(context, 228, 1096, 630, 220, 52);
    }
    context.fillStyle = "rgba(255, 255, 255, 0.86)";
    context.fill();
    context.restore();

    context.fillStyle = "#0b1720";
    context.font = "800 26px Inter, Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "top";

    if (consultantEnabled) {
      let cursorY = 1040;
      cursorY = drawWrappedContactText(context, name, 863, cursorY, 330, 32) + 18;
      cursorY = drawWrappedContactText(context, company, 863, cursorY, 330, 32) + 18;
      drawWrappedContactText(context, phone, 863, cursorY, 330, 32);
      context.textAlign = "left";
      return;
    }

    let cursorY = 1140;
    cursorY = drawWrappedContactText(context, name, 543, cursorY, 560, 32) + 16;
    cursorY = drawWrappedContactText(context, company, 543, cursorY, 560, 32) + 16;
    drawWrappedContactText(context, phone, 543, cursorY, 560, 32);
    context.textAlign = "left";
  }

  // Atualiza o canvas ao vivo conforme as escolhas do ADM.
  async function updateFlyerPreview() {
    if (!flyerForm || !flyerCanvas) return;

    const context = flyerCanvas.getContext("2d");
    const width = flyerCanvas.width;
    const height = flyerCanvas.height;
    const titleData = flyerTitles[flyerFields.title.value] || flyerTitles.imobiliaria;
    const consultantEnabled = isConsultantEnabled();
    const textBox = consultantEnabled
      ? { x: 38, y: 108, width: 614, height: 835, radius: 52, titleX: 345, titleY: 168, listX: 80, listY: 258, listWidth: 500, maxLines: 12, clipX: 64, clipY: 220, clipWidth: 562, clipHeight: 685 }
      : { x: 188, y: 335, width: 704, height: 725, radius: 52, titleX: 540, titleY: 382, listX: 292, listY: 470, listWidth: 520, maxLines: 10, clipX: 240, clipY: 455, clipWidth: 600, clipHeight: 575 };
    const background = createFlyerBackground(context, width, height);

    try {
      const [logoImage, consultantImage] = await Promise.all([
        loadImage(titleData.logo),
        consultantEnabled ? loadImage(flyerAssets.consultants[flyerFields.consultant.value]) : Promise.resolve(null)
      ]);

      drawFlyerBase(context, width, height, background, textBox);
      drawFlyerLogo(context, logoImage, consultantEnabled);
      drawFlyerConsultant(context, consultantImage);
      drawFlyerTextBlock(context, titleData, textBox);
      drawFlyerContactCard(context, consultantEnabled);
    } catch (error) {
      context.fillStyle = "#1265fe";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#ffffff";
      context.font = "800 42px Inter, Arial, sans-serif";
      context.fillText("Não foi possível carregar os assets do panfleto.", 72, 120);
    }

    updateFlyerControls();
  }

  // Limpa os campos e retorna o criador para o estado inicial.
  function resetFlyerForm() {
    flyerForm.reset();
    updateFlyerPreview();
  }

  // Baixa o panfleto final em PNG e reinicia os campos depois do download.
  async function downloadFlyer() {
    await updateFlyerPreview();
    const titleSlug = flyerFields.title.value || "panfleto";
    const link = document.createElement("a");
    link.download = `panfleto-${titleSlug}.png`;
    link.href = flyerCanvas.toDataURL("image/png");
    link.click();
    resetFlyerForm();
  }

  // Conecta os campos do formulário à prévia ao vivo e ao botão de download.
  function setupFlyerBuilder() {
    if (!flyerForm) return;

    Object.values(flyerFields).forEach((field) => {
      field.addEventListener("input", updateFlyerPreview);
      field.addEventListener("change", updateFlyerPreview);
    });

    flyerConsultantRadios.forEach((field) => field.addEventListener("change", updateFlyerPreview));
    document.getElementById("reset-flyer").addEventListener("click", resetFlyerForm);
    document.getElementById("download-flyer").addEventListener("click", downloadFlyer);
    updateFlyerPreview();
  }

  // Inicia o criador de panfletos quando a página do CRM termina de carregar.
  function init() {
    setupFlyerBuilder();
  }

  return { init };
})();

FormCreator.init();
