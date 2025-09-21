# VSCode AI Helper

![Banner](assets/banner.png)

> **VSCode AI Helper** is a Visual Studio Code extension project that brings an AI-powered chat assistant right into your editor. It connects to a HuggingFace model via API, letting you chat with your own LLM, Copilot-style.  
>  
> **Note:** This project is for demonstration and learning purposes. The default HuggingFace model endpoint is currently inactive ("sleeping"). Feel free to fork, edit, and connect your own model!

---

## ✨ Features

- **AI Chat Panel**  
  Interact with a conversational AI model directly inside VSCode.
- **Contextual Assistance**  
  Get code explanations, suggestions, bug fixes, or generate snippets.
- **Customizable Backend**  
  Designed to connect with any HuggingFace-compatible text-generation API—just update the endpoint!
- **Private & Local**  
  No code or chat data leaves your machine except requests sent to your chosen model endpoint.

---

## 🧐 What Is This?

This is a VSCode extension project that creates a sidebar panel for chatting with an AI assistant, similar to Copilot Chat, but powered by your own HuggingFace model.

- All AI responses are fetched from a HuggingFace API endpoint defined in the extension settings.
- The extension comes pre-configured for demonstration, but the example endpoint is currently inactive.  
- **To use it, edit the project and connect your own model endpoint.**

---

## 🛠️ Project Structure

```
vscode-ai-helper-project/
├── src/            # Extension source code
├── assets/         # Images and demo assets
├── package.json    # Extension manifest
└── README.md       # (You are here!)
```

---

## 🧑‍💻 How To Connect Your Own Model

Want to make this work with your own HuggingFace or other LLM endpoint?

1. **Host Your Model:**  
   Deploy a text-generation model (like Llama, Mistral, Falcon, etc.) on [HuggingFace Spaces](https://huggingface.co/spaces) or your own server.

2. **Find Your Endpoint:**  
   Get the API endpoint URL and (if needed) API Key.

3. **Edit the Code:**  
   - Open the extension source (look for API calls in the code, typically in `src/`).
   - Replace the default endpoint with your own.
   - Optionally, add authentication headers or other needed config.

4. **(Optional) Build & Package:**  
   - If you want to test in VSCode, run `npm install && npm run build` inside the project directory, then load it as an unpacked extension.

---

## ⚙️ Settings Reference

| Setting Name                      | Description                                                |
|------------------------------------|------------------------------------------------------------|
| `ai-helper.huggingfaceEndpoint`    | URL to your HuggingFace inference API                      |
| `ai-helper.apiKey`                 | HuggingFace API token (if required)                        |
| `ai-helper.defaultPromptTemplate`  | Optional: Customize the prompt template sent to your model |

---

## 📸 Demo

<p align="center">
  <img src="assets/chat-demo.gif" alt="AI Helper Chat Demo" width="600"/>
</p>

---

## ❓ FAQ

**Q: Why does the extension not respond?**  
A: The demo HuggingFace endpoint is currently sleeping/inactive. To use this, connect your own model as described above.

**Q: Can I use any LLM?**  
A: Yes—just point the extension at any text-generation endpoint with a compatible API.

**Q: Does this share my code with anyone?**  
A: Only with the endpoint you configure in the settings. You control where your data goes!

---

## 🏗️ For Developers

- Fork the repo, customize the extension, and make it your own!
- Contributions and PRs welcome.

---

## 📄 License

MIT License

---

<p align="center">
  <b>Build your own AI Copilot for VSCode—fully under your control!</b>
</p>