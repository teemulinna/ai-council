#!/usr/bin/env python3
"""
Script to apply agent roles integration changes to the codebase.

This script automates the integration of the agent roles system into
backend/main.py and backend/council.py.
"""

import re
import sys
from pathlib import Path


def backup_file(filepath):
    """Create a backup of the file."""
    backup_path = Path(str(filepath) + ".backup")
    content = filepath.read_text()
    backup_path.write_text(content)
    print(f"✅ Backed up {filepath} to {backup_path}")
    return content


def apply_main_py_changes(content):
    """Apply changes to backend/main.py."""
    print("\n🔧 Applying changes to backend/main.py...")

    # Add imports
    import_pattern = r"from \. import storage"
    new_imports = """from . import storage
from .council import run_full_council, generate_conversation_title, stage1_collect_responses, stage2_collect_rankings, stage3_synthesize_final, calculate_aggregate_rankings
from .agent_roles import CouncilComposer, RoleAssigner, get_default_roles, get_available_models"""

    if "from .agent_roles import" not in content:
        content = re.sub(
            r"from \. import storage\nfrom \.council import.*",
            new_imports,
            content
        )
        print("  ✓ Added agent_roles imports")

    # Update Optional import
    if "Optional" not in content:
        content = content.replace(
            "from typing import List, Dict, Any",
            "from typing import List, Dict, Any, Optional"
        )
        print("  ✓ Added Optional to typing imports")

    # Add council_config to SendMessageRequest
    if "council_config: Optional" not in content:
        content = re.sub(
            r'class SendMessageRequest\(BaseModel\):\s+"""Request to send a message in a conversation."""\s+content: str',
            '''class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    content: str
    council_config: Optional[Dict[str, Any]] = None  # Optional council composition config


class CouncilComposeRequest(BaseModel):
    """Request to compose a council with specific configuration."""
    agent_count: Optional[int] = None
    models: Optional[List[str]] = None
    mode: str = "balanced"  # balanced, specialized, diverse


class AddAgentRequest(BaseModel):
    """Request to add an agent to existing council."""
    model: Optional[str] = None


class RemoveAgentRequest(BaseModel):
    """Request to remove an agent from council."""
    agent_index: int''',
            content
        )
        print("  ✓ Added council configuration models")

    # Add new endpoints before @app.get("/api/conversations")
    if "@app.get(\"/api/roles\")" not in content:
        new_endpoints = '''

@app.get("/api/roles")
async def list_roles():
    """List available agent roles."""
    roles = get_default_roles()
    return {
        "roles": [
            {
                "name": role.name,
                "display_name": role.display_name,
                "description": role.description,
                "priority": role.priority
            }
            for role in roles
        ]
    }


@app.get("/api/models")
async def list_models():
    """List available models grouped by tier."""
    models = get_available_models()
    return models


@app.post("/api/council/compose")
async def compose_council(request: CouncilComposeRequest):
    """Compose a council with intelligent role assignments."""
    composer = CouncilComposer()
    council = composer.compose(
        agent_count=request.agent_count,
        models=request.models,
        mode=request.mode
    )
    return council


@app.post("/api/council/add-agent")
async def add_agent(request: AddAgentRequest):
    """Add an agent to the council with automatic role assignment."""
    composer = CouncilComposer()
    council = composer.compose(agent_count=5, mode="balanced")
    updated_council = composer.add_agent(council, model=request.model)
    return updated_council


@app.post("/api/council/remove-agent")
async def remove_agent(request: RemoveAgentRequest):
    """Remove an agent from the council."""
    composer = CouncilComposer()
    council = composer.compose(agent_count=5, mode="balanced")
    updated_council = composer.remove_agent(council, request.agent_index)
    return updated_council


'''
        content = content.replace(
            '@app.get("/api/conversations"',
            new_endpoints + '@app.get("/api/conversations"'
        )
        print("  ✓ Added new role endpoints")

    # Update send_message to pass council_config
    content = re.sub(
        r'stage1_results, stage2_results, stage3_result, metadata = await run_full_council\(\s*request\.content\s*\)',
        '''stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        request.content,
        council_config=request.council_config
    )''',
        content
    )
    print("  ✓ Updated send_message to pass council_config")

    # Update streaming endpoint
    content = re.sub(
        r'stage1_results = await stage1_collect_responses\(request\.content\)',
        '''stage1_results = await stage1_collect_responses(
                request.content,
                council_config=request.council_config
            )''',
        content
    )
    print("  ✓ Updated streaming endpoint")

    return content


def apply_council_py_changes(content):
    """Apply changes to backend/council.py."""
    print("\n🔧 Applying changes to backend/council.py...")

    # Add imports
    if "from .agent_roles import" not in content:
        content = re.sub(
            r'from \.cost_tracker import CostTracker, SmartModelSelector',
            '''from .cost_tracker import CostTracker, SmartModelSelector
from .agent_roles import CouncilComposer, RoleAssigner''',
            content
        )
        print("  ✓ Added agent_roles imports")

    # Add council_composer to shared instances
    if "council_composer = " not in content:
        content = re.sub(
            r'cost_tracker = CostTracker\(\)',
            '''cost_tracker = CostTracker()
council_composer = CouncilComposer()''',
            content
        )
        print("  ✓ Added council_composer instance")

    # Update stage1_collect_responses signature
    content = re.sub(
        r'async def stage1_collect_responses\(user_query: str, use_smart_selection: bool = True\) -> List\[Dict\[str, Any\]\]:',
        '''async def stage1_collect_responses(
    user_query: str,
    use_smart_selection: bool = True,
    council_config: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:''',
        content
    )
    print("  ✓ Updated stage1_collect_responses signature")

    # Update run_full_council signature
    content = re.sub(
        r'async def run_full_council\(user_query: str, use_cache: bool = True\) -> Tuple\[List, List, Dict, Dict\]:',
        '''async def run_full_council(
    user_query: str,
    use_cache: bool = True,
    council_config: Optional[Dict[str, Any]] = None
) -> Tuple[List, List, Dict, Dict]:''',
        content
    )
    print("  ✓ Updated run_full_council signature")

    # Update run_full_council to pass council_config
    content = re.sub(
        r'stage1_results = await stage1_collect_responses\(user_query\)',
        '''stage1_results = await stage1_collect_responses(
            user_query,
            council_config=council_config
        )''',
        content
    )
    print("  ✓ Updated stage1 call in run_full_council")

    print("\n⚠️  Note: Manual updates still needed for stage1_collect_responses implementation")
    print("   See docs/AGENT_ROLES_INTEGRATION_GUIDE.md for full details")

    return content


def main():
    """Main execution function."""
    print("🚀 Agent Roles Integration Script")
    print("=" * 50)

    # Find project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    # Paths to files
    main_py = project_root / "backend" / "main.py"
    council_py = project_root / "backend" / "council.py"

    if not main_py.exists():
        print(f"❌ Error: {main_py} not found")
        sys.exit(1)

    if not council_py.exists():
        print(f"❌ Error: {council_py} not found")
        sys.exit(1)

    # Backup files
    print("\n📦 Creating backups...")
    main_content = backup_file(main_py)
    council_content = backup_file(council_py)

    # Apply changes
    try:
        main_content = apply_main_py_changes(main_content)
        council_content = apply_council_py_changes(council_content)

        # Write updated files
        main_py.write_text(main_content)
        council_py.write_text(council_content)

        print("\n✅ Successfully applied integration changes!")
        print("\n📚 Next steps:")
        print("1. Review the changes in backend/main.py and backend/council.py")
        print("2. See docs/AGENT_ROLES_INTEGRATION_GUIDE.md for remaining manual updates")
        print("3. Test with: ./start.sh")
        print("4. Run tests: python -m pytest tests/unit/test_agent_roles.py -v")

    except Exception as e:
        print(f"\n❌ Error applying changes: {e}")
        print("\n🔄 Restoring backups...")
        main_py.write_text(main_content)
        council_py.write_text(council_content)
        print("✅ Files restored from backup")
        sys.exit(1)


if __name__ == "__main__":
    main()
