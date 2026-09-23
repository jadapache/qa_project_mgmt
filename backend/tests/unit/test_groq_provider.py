import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.ai.providers.implementations import (
    GroqProvider,
    OpenAIProvider,
    ClaudeProvider,
    GeminiProvider,
    OllamaProvider,
    LiteLLMProvider,
)
from app.ai.providers.base import AIMessage


@pytest.mark.asyncio
async def test_groq_provider_with_litellm():
    provider = GroqProvider(api_key="gsk_testkey")
    messages = [AIMessage(role="user", content="Hola")]

    mock_choice = MagicMock()
    mock_choice.message.content = "OK desde Groq LiteLLM"

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.model_dump.return_value = {"choices": [{"message": {"content": "OK desde Groq LiteLLM"}}]}

    with patch("litellm.acompletion", new_callable=AsyncMock) as mock_acompletion:
        mock_acompletion.return_value = mock_response
        result = await provider.complete(messages, model="llama-3.3-70b-versatile")

        assert result.text == "OK desde Groq LiteLLM"
        assert result.model == "llama-3.3-70b-versatile"
        assert mock_acompletion.call_count == 1
        kwargs = mock_acompletion.call_args[1]
        assert kwargs["model"] == "groq/llama-3.3-70b-versatile"
        assert kwargs["api_key"] == "gsk_testkey"


@pytest.mark.asyncio
async def test_all_litellm_model_formatting():
    groq_p = GroqProvider("key")
    assert groq_p._format_model_name("llama3") == "groq/llama3"

    claude_p = ClaudeProvider("key")
    assert claude_p._format_model_name("claude-3-5-haiku-latest") == "anthropic/claude-3-5-haiku-latest"

    gemini_p = GeminiProvider("key")
    assert gemini_p._format_model_name("gemini-1.5-flash") == "gemini/gemini-1.5-flash"
    assert gemini_p._format_model_name("models/gemini-1.5-flash") == "gemini/gemini-1.5-flash"

    ollama_p = OllamaProvider("http://localhost:11434")
    assert ollama_p._format_model_name("llama3.2") == "ollama_chat/llama3.2"

    openai_p = OpenAIProvider("key")
    assert openai_p._format_model_name("openai/gpt-4o") == "gpt-4o"
