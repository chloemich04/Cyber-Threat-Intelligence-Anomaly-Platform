
import os
from typing import Any, Optional

def get_azure_llm(**kwargs):
    from langchain.chat_models import init_chat_model
    from dotenv import load_dotenv
    load_dotenv()
    
    deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT_NAME')
    os.environ['AZURE_OPENAI_API_KEY'] = os.getenv('AZURE_OPENAI_KEY')
    os.environ['AZURE_OPENAI_ENDPOINT'] = os.getenv('AZURE_OPENAI_ENDPOINT')
    os.environ['OPENAI_API_VERSION'] = os.getenv('AZURE_OPENAI_API_VERSION', '2024-02-15-preview')
    
    return init_chat_model(
        f'azure_openai:{deployment}',
        azure_deployment=deployment,
        **kwargs
    )
