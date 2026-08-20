(() => {
  "use strict";

  // お問い合わせフォームの送信先。
  // Google Apps Script のウェブアプリURL（/exec で終わるもの）をここに貼る。
  // 空のままなら送信ボタンは押せないままで、外部へは何も送られない。
  const CONTACT_ENDPOINT = "https://script.google.com/macros/s/AKfycbyutgvebXG9PZQwJrhAoTrAwyy8KkDTTBPIc-Vc26KiX8B6uR_zlbjRTCgOvmVCl5_XvA/exec";

  // 同じ画面から続けて送信できるようになるまでの待ち時間（ミリ秒）
  const CONTACT_COOLDOWN_MS = 60000;

  // GA4イベント送信。氏名・メール・相談本文などの個人情報は絶対に含めない。
  const gaEvent = (name, params = {}) => {
    if (typeof window.gtag === "function") window.gtag("event", name, params);
  };

  const currentQuery = new URLSearchParams(window.location.search);
  const currentCategory = currentQuery.get("category") || "";
  const currentConcern = currentQuery.get("concern") || "";

  // ストーリー・支援内容ページの閲覧を記録する
  const pathMatch = window.location.pathname.match(/\/(stories|support)\/([^/]+)\/?$/);
  if (pathMatch) {
    const [, kind, slug] = pathMatch;
    gaEvent(kind === "stories" ? "view_story" : "view_support", {
      [kind === "stories" ? "story_id" : "support_id"]: slug,
      category: currentCategory,
      concern_id: currentConcern,
    });
  }

  // Xプロフィールへのクリックを記録する（表示場所＝ページパス）
  document.querySelectorAll('a[href*="x.com/Yurin275"]').forEach((link) => {
    link.addEventListener("click", () => {
      gaEvent("click_x_profile", { placement: window.location.pathname });
    });
  });

  const menuButton = document.querySelector("[data-menu-button]");
  const siteNav = document.querySelector("[data-site-nav]");
  const menuLabel = document.querySelector("[data-menu-label]");
  const desktopNavigation = window.matchMedia("(min-width: 56rem)");

  const setMenuState = (isOpen, returnFocus = false) => {
    if (!menuButton || !siteNav) return;

    const isDesktop = desktopNavigation.matches;
    siteNav.hidden = isDesktop ? false : !isOpen;
    menuButton.setAttribute("aria-expanded", String(isDesktop || isOpen));
    if (menuLabel) menuLabel.textContent = isOpen ? "閉じる" : "メニュー";

    if (returnFocus && !isDesktop) menuButton.focus();
  };

  if (menuButton && siteNav) {
    setMenuState(false);

    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      setMenuState(!isOpen);
    });

    siteNav.addEventListener("click", (event) => {
      if (event.target.closest("a") && !desktopNavigation.matches) setMenuState(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        setMenuState(false, true);
      }
    });

    desktopNavigation.addEventListener("change", () => setMenuState(false));
  }

  // TOPへ戻るボタン：一定スクロール量を超えたら表示する
  const backToTop = document.createElement("a");
  backToTop.href = "#";
  backToTop.className = "back-to-top";
  backToTop.setAttribute("aria-label", "ページの先頭へ戻る");
  backToTop.innerHTML = "<span>TOPへ</span>";
  document.body.appendChild(backToTop);

  const BACK_TO_TOP_THRESHOLD = 600;
  const toggleBackToTop = () => {
    backToTop.classList.toggle("is-visible", window.scrollY > BACK_TO_TOP_THRESHOLD);
  };
  toggleBackToTop();
  window.addEventListener("scroll", toggleBackToTop, { passive: true });

  backToTop.addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const concernApp = document.querySelector("[data-concerns-app]");
  if (concernApp) initConcerns(concernApp);

  function initConcerns(concernApp) {

  const categories = {
    marketing: "集客・発信",
    operations: "事務・情報整理",
    customer: "お客様対応",
  };

  const concerns = [
    {
      id: "1-1",
      slug: "social-results",
      categoryId: "marketing",
      title: "発信しているのに仕事につながっている感じがしない",
      empathy: "投稿の反応を見ても次に何を変えればよいのか分からず不安になるときに。",
      destinationType: "support",
      destinationId: "marketing",
      thumbnail: null,
      status: "event-ready",
    },
    {
      id: "1-2",
      slug: "what-to-post",
      categoryId: "marketing",
      title: "何を発信すればお客様に伝わるのか分からない",
      empathy: "伝えたいことはあるのに写真や文章を前にすると手が止まってしまうときに。",
      destinationType: "support",
      destinationId: "marketing",
      thumbnail: null,
      status: "event-ready",
    },
    {
      id: "1-3",
      slug: "posting-later",
      categoryId: "marketing",
      title: "発信したいけれど日々の仕事で後回しになる",
      empathy: "接客や片付けのあと毎回ゼロから投稿を考える余力が残らないときに。",
      destinationType: "story",
      destinationId: "mata-ashita",
      storyTitle: "閉店後の「また明日」",
      thumbnail: null,
      status: "story-confirmed",
    },
    {
      id: "1-4",
      slug: "new-customers",
      categoryId: "marketing",
      title: "紹介や既存客に頼っていて新しいお客様へ届かない",
      empathy: "今のつながりを大切にしながらどこから新しい入口を考えればよいか迷うときに。",
      destinationType: "support",
      destinationId: "marketing",
      thumbnail: null,
      status: "event-ready",
    },
    {
      id: "1-5",
      slug: "too-many-channels",
      categoryId: "marketing",
      title: "集客方法が多すぎてどこに力を入れるべきか分からない",
      empathy: "SNS・紹介・Webなど全部を続けようとして手が回らなくなっているときに。",
      destinationType: "support",
      destinationId: "marketing",
      thumbnail: null,
      status: "event-ready",
    },
    {
      id: "2-1",
      slug: "monthly-invoices",
      categoryId: "operations",
      title: "請求書の整理が毎月ぎりぎりになる",
      empathy: "メールに埋もれた書類を月末に探し直し本来の仕事へ戻る気力が削られるときに。",
      destinationType: "story",
      destinationId: "invoice",
      storyTitle: "毎月変わる あの請求書",
      thumbnail: null,
      status: "story-confirmed",
    },
    {
      id: "2-2",
      slug: "repeat-entry",
      categoryId: "operations",
      title: "同じ内容を何度も別の表へ入力している",
      empathy: "書き直すたびに入力漏れや転記ミスがないか確かめ続けているときに。",
      destinationType: "support",
      destinationId: "operations",
      thumbnail: null,
      status: "event-ready",
    },
    {
      id: "2-3",
      slug: "scattered-information",
      categoryId: "operations",
      title: "必要な情報がメール・チャット・紙に散らばっている",
      empathy: "どこに何があるか思い出すことから始まり探すだけで時間が過ぎるときに。",
      destinationType: "support",
      destinationId: "operations",
      thumbnail: null,
      status: "event-ready",
    },
    {
      id: "2-4",
      slug: "handwritten-bookings",
      categoryId: "operations",
      title: "予約を手書きで管理していて抜けや重なりが怖い",
      empathy: "書いた場所や変更内容を何度も確認し予定が重なっていないか不安になるときに。",
      destinationType: "support",
      destinationId: "operations",
      thumbnail: null,
      status: "event-ready",
    },
    {
      id: "2-5",
      slug: "admin-overload",
      categoryId: "operations",
      title: "事務に追われて本来やりたい仕事が進まない",
      empathy: "忙しく働いたのに明日の準備や本業をまた後回しにしてしまうときに。",
      destinationType: "support",
      destinationId: "operations",
      thumbnail: null,
      status: "event-ready",
    },
    {
      id: "3-1",
      slug: "customer-history",
      categoryId: "customer",
      title: "前回の問い合わせや購入内容をすぐ確認できない",
      empathy: "過去のやり取りを探しながらお客様を待たせていないか気になるときに。",
      destinationType: "support",
      destinationId: "customer-care",
      thumbnail: null,
      status: "event-ready",
    },
    {
      id: "3-2",
      slug: "many-inboxes",
      categoryId: "customer",
      title: "メールやDMが複数の場所に届き返信漏れが怖い",
      empathy: "通知が来るたびに画面を行き来し対応済みか分からなくなるときに。",
      destinationType: "support",
      destinationId: "customer-care",
      thumbnail: null,
      status: "event-ready",
    },
    {
      id: "3-3",
      slug: "repeated-questions",
      categoryId: "customer",
      title: "同じ質問に毎日何度も答えている",
      empathy: "同じ返事でも間違えられず目の前の仕事が何度も中断するときに。",
      destinationType: "story",
      destinationId: "mata-kono-shitsumon",
      storyTitle: "また この質問",
      thumbnail: null,
      status: "story-confirmed",
    },
    {
      id: "3-4",
      slug: "inconsistent-guidance",
      categoryId: "customer",
      title: "人によって案内が違いお客様を迷わせてしまう",
      empathy: "同じ質問への返し方がそろわずどの案内が正しいか確認が増えているときに。",
      destinationType: "support",
      destinationId: "customer-care",
      thumbnail: null,
      status: "event-ready",
    },
    {
      id: "3-5",
      slug: "complaint-replies",
      categoryId: "customer",
      title: "クレームへの返し方に迷い返信が遅くなる",
      empathy: "失礼にならず安易な約束もしない言葉を一人で考え続けているときに。",
      destinationType: "support",
      destinationId: "customer-care",
      thumbnail: null,
      status: "event-ready",
    },
  ];

  const categoryButtons = [...concernApp.querySelectorAll("[data-category]")];
  const typeButtons = [...concernApp.querySelectorAll("[data-type]")];
  const list = concernApp.querySelector("[data-concern-list]");
  const status = concernApp.querySelector("[data-results-status]");
  const categoryLabel = concernApp.querySelector("[data-results-category]");
  const query = new URLSearchParams(window.location.search);
  let selectedCategory = categories[query.get("category")] ? query.get("category") : "marketing";
  let selectedType = ["all", "story", "support"].includes(query.get("type")) ? query.get("type") : "all";

  const setPressed = (buttons, dataName, selected) => {
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset[dataName] === selected));
    });
  };

  const createIcon = (type) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      type === "story"
        ? "M4 5.5c2.8-.9 5.3-.6 8 1v12c-2.7-1.6-5.2-1.9-8-1V5.5Zm16 0c-2.8-.9-5.3-.6-8 1v12c2.7-1.6 5.2-1.9 8-1V5.5Z"
        : "M5 6h14M5 12h14M5 18h9M3 6h.01M3 12h.01M3 18h.01"
    );
    svg.append(path);
    return svg;
  };

  const createCard = (concern) => {
    const article = document.createElement("article");
    article.className = `concern-card concern-card--${concern.destinationType}`;
    article.id = `concern-${concern.id}`;

    const meta = document.createElement("div");
    meta.className = "concern-card__meta";

    const label = document.createElement("span");
    label.className = "concern-card__label";
    label.append(createIcon(concern.destinationType));
    label.append(concern.destinationType === "story" ? "マンガ" : "一緒に整理すること");

    const id = document.createElement("span");
    id.className = "concern-card__id";
    id.textContent = `管理ID ${concern.id}`;
    meta.append(label, id);

    const heading = document.createElement("h3");
    heading.textContent = concern.title;

    const empathy = document.createElement("p");
    empathy.className = "concern-card__empathy";
    empathy.textContent = concern.empathy;

    article.append(meta, heading, empathy);

    if (concern.storyTitle) {
      const storyTitle = document.createElement("p");
      storyTitle.className = "concern-card__story-title";
      storyTitle.textContent = `ストーリー「${concern.storyTitle}」`;
      article.append(storyTitle);
    }

    const link = document.createElement("a");
    const params = new URLSearchParams({ category: concern.categoryId, concern: concern.id });
    link.href =
      concern.destinationType === "story"
        ? `../stories/${concern.destinationId}/?${params}`
        : `../support/${concern.destinationId}/?${params}`;
    link.className = `button ${concern.destinationType === "story" ? "button--primary" : "button--secondary"}`;
    link.textContent = concern.destinationType === "story" ? "マンガで見る📖" : "できることを見る";
    link.setAttribute("aria-label", `${link.textContent}：${concern.title}`);
    link.addEventListener("click", () => {
      gaEvent("select_concern", { category: concern.categoryId, concern_id: concern.id });
    });
    article.append(link);

    return article;
  };

  const renderConcerns = () => {
    const filtered = concerns.filter(
      (concern) =>
        concern.categoryId === selectedCategory &&
        (selectedType === "all" || concern.destinationType === selectedType)
    );

    list.replaceChildren(...filtered.map(createCard));
    categoryLabel.textContent = categories[selectedCategory];
    status.textContent = `${filtered.length}件を表示しています`;
    setPressed(categoryButtons, "category", selectedCategory);
    setPressed(typeButtons, "type", selectedType);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("category", selectedCategory);
    if (selectedType === "all") nextUrl.searchParams.delete("type");
    else nextUrl.searchParams.set("type", selectedType);
    window.history.replaceState({}, "", nextUrl);
  };

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;
      renderConcerns();
    });
  });

  typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedType = button.dataset.type;
      renderConcerns();
    });
  });

    renderConcerns();

    // カードはJSで描画するため、URLのハッシュ（#concern-1-3など）は描画後に自分で移動する
    const hashId = decodeURIComponent(window.location.hash.slice(1));
    if (hashId) {
      const target = document.getElementById(hashId);
      if (target) {
        // focusはスクロール中に呼ぶと移動を打ち消すため、先にフォーカスしてから移動する
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        // 通常の#リンクと同じく、到着時は即時移動にする
        target.scrollIntoView({ behavior: "instant", block: "center" });
      }
    }
  }

  const concernTitles = {
    "1-1": "発信しているのに仕事につながっている感じがしない",
    "1-2": "何を発信すればお客様に伝わるのか分からない",
    "1-3": "発信したいけれど日々の仕事で後回しになる",
    "1-4": "紹介や既存客に頼っていて新しいお客様へ届かない",
    "1-5": "集客方法が多すぎてどこに力を入れるべきか分からない",
    "2-1": "請求書の整理が毎月ぎりぎりになる",
    "2-2": "同じ内容を何度も別の表へ入力している",
    "2-3": "必要な情報がメール・チャット・紙に散らばっている",
    "2-4": "予約を手書きで管理していて抜けや重なりが怖い",
    "2-5": "事務に追われて本来やりたい仕事が進まない",
    "3-1": "前回の問い合わせや購入内容をすぐ確認できない",
    "3-2": "メールやDMが複数の場所に届き返信漏れが怖い",
    "3-3": "同じ質問に毎日何度も答えている",
    "3-4": "人によって案内が違いお客様を迷わせてしまう",
    "3-5": "クレームへの返し方に迷い返信が遅くなる",
  };

  const contextQuery = new URLSearchParams(window.location.search);
  const contextCategory = contextQuery.get("category") || "";
  const contextConcern = contextQuery.get("concern") || "";
  const originConcern = document.querySelector("[data-origin-concern]");
  const contextualContactLink = document.querySelector("[data-context-contact]");

  if (originConcern) {
    if (concernTitles[contextConcern]) {
      originConcern.hidden = false;
      originConcern.querySelector("[data-origin-title]").textContent = concernTitles[contextConcern];
    } else {
      originConcern.hidden = true;
    }
  }

  if (contextualContactLink) {
    const contactUrl = new URL(contextualContactLink.href);
    if (contextCategory) contactUrl.searchParams.set("category", contextCategory);
    if (contextConcern) contactUrl.searchParams.set("concern", contextConcern);
    contextualContactLink.href = contactUrl;
  }

  // 送信先が設定されているかどうかで、各ページの説明文を切り替える。
  // 設定前は「送信されません」という説明のままにして、実態とズレないようにする。
  // お問い合わせページとプライバシーポリシーの両方で使う。
  const endpointReady = /^https:\/\/script\.google\.com\/.+\/exec$/.test(CONTACT_ENDPOINT);
  if (endpointReady) {
    document.querySelectorAll("[data-endpoint-notice]").forEach((el) => (el.hidden = true));
    document.querySelectorAll("[data-endpoint-active]").forEach((el) => (el.hidden = false));
  }

  const contactForm = document.querySelector("[data-contact-form]");
  if (contactForm) {
    gaEvent("begin_contact", { category: currentCategory, concern_id: currentConcern });
    const categoryField = contactForm.elements.category;
    const concernField = contactForm.elements.concern;
    const concernOptions = [...concernField.querySelectorAll("option[data-category]")];
    const preview = document.querySelector("[data-form-preview]");
    const previewHeading = preview?.querySelector("h2");
    const previewNote = preview?.querySelector("[data-preview-note]");
    const editButton = preview?.querySelector("[data-edit-form]");
    const sendButton = preview?.querySelector("[data-send-form]");
    const statusOutput = preview?.querySelector("[data-form-status]");
    const complete = document.querySelector("[data-form-complete]");
    const completeHeading = complete?.querySelector("h2");
    const honeypotField = contactForm.elements.contact_reference;

    if (endpointReady) {
      if (previewNote) {
        previewNote.textContent =
          "この内容で送信します。直したいところがあれば「入力を修正する」から戻れます。";
      }
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = "この内容で送信する";
      }
    }

    // フォームを開いた時刻。表示から数秒未満で送信されたものは機械とみなす。
    const openedAt = Date.now();
    let sending = false;

    const setStatus = (text) => {
      if (statusOutput) statusOutput.textContent = text;
    };

    // 送信後の待ち時間。再読み込みされても効くようセッションに残す。
    const remainingCooldownMs = () => {
      try {
        const lastSentAt = Number(sessionStorage.getItem("contactLastSentAt") || 0);
        return Math.max(0, lastSentAt + CONTACT_COOLDOWN_MS - Date.now());
      } catch (error) {
        return 0; // 保存が使えない設定のブラウザでは、送信先側の連投制限に任せる
      }
    };

    const updateConcernOptions = (keepValue = true) => {
      const previousValue = keepValue ? concernField.value : "";
      concernOptions.forEach((option) => {
        option.hidden = Boolean(categoryField.value) && option.dataset.category !== categoryField.value;
      });
      concernField.value = concernOptions.some(
        (option) => !option.hidden && option.value === previousValue
      )
        ? previousValue
        : "";
    };

    if (["marketing", "operations", "customer"].includes(contextCategory)) {
      categoryField.value = contextCategory;
    }
    updateConcernOptions();
    if (concernTitles[contextConcern]) concernField.value = contextConcern;

    categoryField.addEventListener("change", () => updateConcernOptions(false));

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!contactForm.reportValidity()) return;

      const formData = new FormData(contactForm);
      const categoryText = categoryField.options[categoryField.selectedIndex]?.text || "未選択";
      const concernText = concernField.options[concernField.selectedIndex]?.text || "未選択";
      const previewValues = {
        name: formData.get("name"),
        company: formData.get("company") || "未入力",
        email: formData.get("email"),
        category: categoryText,
        concern: concernText,
        message: formData.get("message"),
      };

      Object.entries(previewValues).forEach(([key, value]) => {
        const output = preview.querySelector(`[data-preview-${key}]`);
        if (output) output.textContent = value;
      });

      setStatus("");
      preview.hidden = false;
      contactForm.hidden = true;
      previewHeading?.focus();
    });

    editButton?.addEventListener("click", () => {
      setStatus("");
      preview.hidden = true;
      contactForm.hidden = false;
      contactForm.elements.name.focus();
    });

    sendButton?.addEventListener("click", async () => {
      if (sending || !endpointReady) return;

      const waitMs = remainingCooldownMs();
      if (waitMs > 0) {
        setStatus(
          `続けて送信されないよう、あと${Math.ceil(waitMs / 1000)}秒お待ちください。入力内容はそのまま残っています。`
        );
        return;
      }

      sending = true;
      sendButton.disabled = true;
      if (editButton) editButton.disabled = true;
      setStatus("送信しています。そのままお待ちください。");

      const formData = new FormData(contactForm);
      const payload = {
        name: formData.get("name"),
        company: formData.get("company"),
        email: formData.get("email"),
        category: formData.get("category"),
        concern: formData.get("concern"),
        message: formData.get("message"),
        privacy_agreement: contactForm.elements.privacy_agreement.checked,
        contact_reference: honeypotField ? honeypotField.value : "",
        elapsed: Date.now() - openedAt,
      };

      try {
        // Content-Type を text/plain にしているのは、application/json だと
        // ブラウザが送信前に確認用リクエストを投げ、Apps Script が
        // それに応答できず失敗するため。中身はJSON文字列のまま送る。
        const response = await fetch(CONTACT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`送信先が応答を返しませんでした（${response.status}）。`);

        let result;
        try {
          result = await response.json();
        } catch (parseError) {
          throw new Error("送信先からの応答を読み取れませんでした。");
        }
        if (!result?.ok) throw new Error(result?.error || "送信先で受け付けられませんでした。");

        gaEvent("generate_lead", { category: currentCategory, concern_id: currentConcern });

        try {
          sessionStorage.setItem("contactLastSentAt", String(Date.now()));
        } catch (error) {
          // 保存できなくても送信自体は完了しているので、そのまま進める
        }

        // 完了後に入力内容が画面へ残らないようにする
        contactForm.reset();
        updateConcernOptions(false);
        preview.querySelectorAll("dd").forEach((cell) => (cell.textContent = ""));
        setStatus("");

        preview.hidden = true;
        if (complete) {
          complete.hidden = false;
          completeHeading?.focus();
        }
      } catch (error) {
        console.error(error);
        // fetch が投げる TypeError は「そもそも通信できなかった」場合。
        // 英語のまま出しても伝わらないので、日本語の説明に置き換える。
        const detail = error instanceof TypeError
          ? "ネットワークにつながっていない可能性があります。"
          : error.message;
        setStatus(
          `送信できませんでした。${detail}通信環境をご確認のうえ、もう一度お試しください。入力内容は残っています。`
        );
        sending = false;
        sendButton.disabled = false;
        if (editButton) editButton.disabled = false;
      }
    });
  }
})();
