#!/usr/bin/env python3
"""
LLM Interface

This module provides an abstract interface for interacting with Large Language Models (LLMs)
and concrete implementations for specific providers.
"""

import os
import json
import base64
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Union, Any
from enum import Enum
import requests
from PIL import Image
import io

class MessageRole(str, Enum):
    """Enum for message roles in LLM conversations"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class ContentType(str, Enum):
    """Enum for content types in LLM messages"""
    TEXT = "text"
    IMAGE = "image"

class MessageContent:
    """Content for LLM messages with mixed text and images"""
    
    def __init__(self, content_type: ContentType, text: Optional[str] = None, image_path: Optional[str] = None):
        self.type = content_type
        self.text = text
        self.image_path = image_path
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format for API requests"""
        if self.type == ContentType.TEXT:
            return {"type": "text", "text": self.text}
        elif self.type == ContentType.IMAGE:
            # For image content, we need to handle the image data
            if not self.image_path:
                raise ValueError("Image path is required for image content")
            
            # Convert image to base64
            with open(self.image_path, "rb") as img_file:
                img_data = img_file.read()
                base64_data = base64.b64encode(img_data).decode("utf-8")
                
                # Determine MIME type based on file extension
                mime_type = "image/jpeg"  # Default
                if self.image_path.lower().endswith(".png"):
                    mime_type = "image/png"
                elif self.image_path.lower().endswith(".gif"):
                    mime_type = "image/gif"
                
                return {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{base64_data}",
                        "detail": "high"
                    }
                }
        
        raise ValueError(f"Unsupported content type: {self.type}")

class LLMMessage:
    """Message format for LLM interactions"""
    
    def __init__(self, role: MessageRole, content: Union[str, List[MessageContent]]):
        self.role = role
        self.content = content
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format for API requests"""
        if isinstance(self.content, str):
            return {"role": self.role.value, "content": self.content}
        else:
            return {
                "role": self.role.value,
                "content": [content.to_dict() for content in self.content]
            }

class LLMResponse:
    """Response format for LLM interactions"""
    
    def __init__(self, content: str, input_tokens: int, output_tokens: int):
        self.content = content
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format"""
        return {
            "message": {
                "role": MessageRole.ASSISTANT.value,
                "content": self.content
            },
            "usage": {
                "input_tokens": self.input_tokens,
                "output_tokens": self.output_tokens
            }
        }

class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    def send_message(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None
    ) -> LLMResponse:
        """
        Send a message to the LLM and get a response
        
        Args:
            messages: List of messages in the conversation
            system_prompt: Optional system prompt to guide the LLM's behavior
            
        Returns:
            LLMResponse object with the LLM's response
        """
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """
        Get the name of the provider
        
        Returns:
            The provider name
        """
        pass
    
    @abstractmethod
    def get_model_name(self) -> str:
        """
        Get the current model being used
        
        Returns:
            The model name
        """
        pass
    
    @abstractmethod
    def supports_images(self) -> bool:
        """
        Check if the provider supports image inputs
        
        Returns:
            Boolean indicating if images are supported
        """
        pass

class OpenAIProvider(LLMProvider):
    """OpenAI LLM provider implementation"""
    
    def __init__(self, model: Optional[str] = None, max_tokens: int = 4096):
        """
        Create a new OpenAI provider
        
        Args:
            model: Optional model name (defaults to environment variable or 'gpt-4o')
            max_tokens: Maximum tokens for the response
        """
        self.api_key = os.environ.get("OPENAI_API_KEY")
        
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        
        self.model = model or os.environ.get("OPENAI_MODEL", "gpt-4o")
        self.max_tokens = max_tokens
        self.api_url = "https://api.openai.com/v1/chat/completions"
    
    def send_message(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None
    ) -> LLMResponse:
        """
        Send a message to OpenAI and get a response
        
        Args:
            messages: List of messages in the conversation
            system_prompt: Optional system prompt to guide OpenAI's behavior
            
        Returns:
            LLMResponse object with OpenAI's response
        """
        try:
            # Format messages for OpenAI API
            formatted_messages = [message.to_dict() for message in messages]
            
            # Add system message if provided
            if system_prompt:
                formatted_messages.insert(0, {
                    "role": MessageRole.SYSTEM.value,
                    "content": system_prompt
                })
            
            # Prepare request payload
            payload = {
                "model": self.model,
                "messages": formatted_messages,
                "max_tokens": self.max_tokens
            }
            
            # Call OpenAI API
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload
            )
            
            response.raise_for_status()
            response_data = response.json()
            
            # Extract content from response
            content = response_data["choices"][0]["message"]["content"]
            
            # Extract usage information
            input_tokens = response_data["usage"]["prompt_tokens"]
            output_tokens = response_data["usage"]["completion_tokens"]
            
            return LLMResponse(content, input_tokens, output_tokens)
            
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            raise
    
    def get_provider_name(self) -> str:
        """
        Get the name of the provider
        
        Returns:
            The provider name
        """
        return "OpenAI"
    
    def get_model_name(self) -> str:
        """
        Get the current model being used
        
        Returns:
            The model name
        """
        return self.model
    
    def supports_images(self) -> bool:
        """
        Check if the provider supports image inputs
        
        Returns:
            Boolean indicating if images are supported
        """
        # Only GPT-4 Vision models support images
        return "gpt-4" in self.model or "gpt-4o" in self.model

class LLMFactory:
    """Factory for creating LLM providers"""
    
    @staticmethod
    def get_default_provider() -> LLMProvider:
        """
        Get the default LLM provider (OpenAI)
        
        Returns:
            Default LLM provider instance
        """
        # Get the provider type from environment variable (default to OpenAI)
        provider_type = os.environ.get("DM_THIS_CHAT_LLM", "openai").lower()
        
        # Initialize the provider
        if provider_type == "openai":
            return OpenAIProvider()
        else:
            # Default to OpenAI if provider not recognized
            return OpenAIProvider()
