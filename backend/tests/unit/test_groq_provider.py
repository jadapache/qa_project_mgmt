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
    assert groq_p._format_model_name("qwen-2.5-32b") == "groq/qwen-2.5-32b"
    assert groq_p._format_model_name("groq/qwen-2.5-32b") == "groq/qwen-2.5-32b"

    claude_p = ClaudeProvider("key")
    assert claude_p._format_model_name("claude-3-5-haiku-latest") == "anthropic/claude-3-5-haiku-latest"

    gemini_p = GeminiProvider("key")
    assert gemini_p._format_model_name("gemini-1.5-flash") == "gemini/gemini-1.5-flash"
    assert gemini_p._format_model_name("models/gemini-1.5-flash") == "gemini/gemini-1.5-flash"

    ollama_p = OllamaProvider("http://localhost:11434")
    assert ollama_p._format_model_name("llama3.2") == "ollama_chat/llama3.2"

    openai_p = OpenAIProvider("key")
    assert openai_p._format_model_name("openai/gpt-4o") == "gpt-4o"


def test_provider_registry():
    from app.ai.providers.registry import find_provider_spec, PROVIDER_REGISTRY
    assert find_provider_spec("groq") is not None
    assert find_provider_spec("groq").litellm_prefix == "groq"
    assert find_provider_spec("anthropic").id == "claude"
    assert find_provider_spec("google").id == "gemini"
    assert find_provider_spec("builtin").id == "ollama"
    assert find_provider_spec("unknown_xyz") is None


def test_resolve_provider_with_registry():
    from app.ai.providers.factory import resolve_provider
    p_groq = resolve_provider("groq", "llama-3.3-70b-versatile", api_key="gsk_test")
    assert p_groq.id == "groq"
    assert p_groq._format_model_name("llama-3.3-70b-versatile") == "groq/llama-3.3-70b-versatile"

    p_ollama = resolve_provider("ollama", "llama3.2", base_url="http://localhost:11434")
    assert p_ollama.id == "ollama"
    assert p_ollama._format_model_name("llama3.2") == "ollama_chat/llama3.2"

