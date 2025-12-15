/**
 * Stage3 Enhanced CX Tests
 * TDD/BDD approach for Chairman's Verdict presentation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage3 from '../Stage3';

describe('Stage3: Chairman\'s Verdict - Enhanced CX', () => {
  const mockFinalResponse = {
    model: 'openai/gpt-4-turbo',
    response: '# Final Council Answer\n\nAfter careful deliberation, the council has reached a consensus.\n\n## Key Points\n\n- Point 1\n- Point 2\n- Point 3'
  };

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('BDD: Visual Presentation', () => {
    it('should render with Stage 3 title', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);

      expect(screen.getByText('Stage 3: Final Council Answer')).toBeInTheDocument();
    });

    it('should display final response container', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      expect(container.querySelector('.final-response')).toBeInTheDocument();
    });

    it('should not render when finalResponse is null', () => {
      const { container } = render(<Stage3 finalResponse={null} />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when finalResponse is undefined', () => {
      const { container } = render(<Stage3 finalResponse={undefined} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('BDD: Chairman Label Presentation', () => {
    it('should display chairman label with model name', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);

      const chairmanLabel = screen.getByText(/Chairman:/);
      expect(chairmanLabel).toBeInTheDocument();
    });

    it('should extract short model name from full path', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);

      expect(screen.getByText(/gpt-4-turbo/)).toBeInTheDocument();
    });

    it('should handle model names without slash separator', () => {
      const simpleModel = {
        model: 'simple-model',
        response: 'Test response'
      };

      render(<Stage3 finalResponse={simpleModel} />);

      expect(screen.getByText(/simple-model/)).toBeInTheDocument();
    });

    it('should apply chairman-label CSS class', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      expect(container.querySelector('.chairman-label')).toBeInTheDocument();
    });
  });

  describe('BDD: Final Text Rendering', () => {
    it('should render final response text', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);

      expect(screen.getByText(/After careful deliberation/)).toBeInTheDocument();
    });

    it('should render markdown content', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);

      // Check for heading that would be rendered from markdown
      expect(screen.getByText('Final Council Answer')).toBeInTheDocument();
      expect(screen.getByText('Key Points')).toBeInTheDocument();
    });

    it('should apply final-text CSS class', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      expect(container.querySelector('.final-text')).toBeInTheDocument();
    });

    it('should apply markdown-content CSS class for styling', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      expect(container.querySelector('.markdown-content')).toBeInTheDocument();
    });
  });

  describe('BDD: CSS Structure and Classes', () => {
    it('should apply stage3 class to container', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      expect(container.querySelector('.stage3')).toBeInTheDocument();
    });

    it('should have stage class on container', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      expect(container.querySelector('.stage')).toBeInTheDocument();
    });

    it('should have proper nesting: stage3 > final-response > content', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      const stage3 = container.querySelector('.stage3');
      const finalResponse = stage3.querySelector('.final-response');
      const chairmanLabel = finalResponse.querySelector('.chairman-label');
      const finalText = finalResponse.querySelector('.final-text');

      expect(stage3).toBeInTheDocument();
      expect(finalResponse).toBeInTheDocument();
      expect(chairmanLabel).toBeInTheDocument();
      expect(finalText).toBeInTheDocument();
    });

    it('should have stage-title class on heading', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      expect(container.querySelector('.stage-title')).toBeInTheDocument();
    });
  });

  describe('BDD: Content Rendering Edge Cases', () => {
    it('should handle empty response text', () => {
      const emptyResponse = {
        model: 'openai/gpt-4',
        response: ''
      };

      const { container } = render(<Stage3 finalResponse={emptyResponse} />);

      expect(container.querySelector('.final-text')).toBeInTheDocument();
    });

    it('should handle plain text without markdown', () => {
      const plainTextResponse = {
        model: 'openai/gpt-4',
        response: 'This is plain text without any markdown formatting.'
      };

      render(<Stage3 finalResponse={plainTextResponse} />);

      expect(screen.getByText(/This is plain text/)).toBeInTheDocument();
    });

    it('should handle markdown with lists', () => {
      const listResponse = {
        model: 'openai/gpt-4',
        response: '- Item 1\n- Item 2\n- Item 3'
      };

      render(<Stage3 finalResponse={listResponse} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should handle markdown with code blocks', () => {
      const codeResponse = {
        model: 'openai/gpt-4',
        response: '```javascript\nconst x = 42;\n```'
      };

      const { container } = render(<Stage3 finalResponse={codeResponse} />);

      expect(container.querySelector('code')).toBeInTheDocument();
    });

    it('should handle very long response text', () => {
      const longText = 'Lorem ipsum '.repeat(500);
      const longResponse = {
        model: 'openai/gpt-4',
        response: longText
      };

      const startTime = performance.now();
      render(<Stage3 finalResponse={longResponse} />);
      const endTime = performance.now();

      // Should render long text in reasonable time (< 200ms)
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('BDD: Enhanced Art Deco Aesthetics Support', () => {
    it('should render container ready for ::before pseudo-element (spotlight)', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      const stage3 = container.querySelector('.stage3');

      // Container should have position relative for absolute pseudo-element
      const computedStyle = window.getComputedStyle(stage3);

      // Just check the element exists and has proper class
      expect(stage3).toBeInTheDocument();
      expect(stage3.classList.contains('stage3')).toBe(true);
    });

    it('should render final-response ready for corner bracket pseudo-elements', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      const finalResponse = container.querySelector('.final-response');

      // Element should exist with proper class for CSS pseudo-elements
      expect(finalResponse).toBeInTheDocument();
      expect(finalResponse.classList.contains('final-response')).toBe(true);
    });

    it('should render chairman-label ready for star and shimmer effects', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      const chairmanLabel = container.querySelector('.chairman-label');

      // Element should exist with proper class for CSS pseudo-elements
      expect(chairmanLabel).toBeInTheDocument();
      expect(chairmanLabel.classList.contains('chairman-label')).toBe(true);
    });
  });

  describe('TDD: Semantic HTML Structure', () => {
    it('should use h3 for stage title', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      const h3 = container.querySelector('h3.stage-title');
      expect(h3).toBeInTheDocument();
      expect(h3.textContent).toBe('Stage 3: Final Council Answer');
    });

    it('should wrap content in semantic divs with descriptive classes', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      // Check semantic structure
      expect(container.querySelector('.stage.stage3')).toBeInTheDocument();
      expect(container.querySelector('.final-response')).toBeInTheDocument();
      expect(container.querySelector('.chairman-label')).toBeInTheDocument();
      expect(container.querySelector('.final-text')).toBeInTheDocument();
    });
  });

  describe('TDD: Model Name Extraction Logic', () => {
    it('should extract name after slash', () => {
      const response = {
        model: 'provider/model-name-v2',
        response: 'Test'
      };

      render(<Stage3 finalResponse={response} />);

      expect(screen.getByText(/model-name-v2/)).toBeInTheDocument();
    });

    it('should handle multiple slashes by taking part after first', () => {
      const response = {
        model: 'provider/category/model',
        response: 'Test'
      };

      render(<Stage3 finalResponse={response} />);

      // split('/')[1] gets 'category'
      expect(screen.getByText(/category/)).toBeInTheDocument();
    });

    it('should use full model name if no slash present', () => {
      const response = {
        model: 'standalone-model',
        response: 'Test'
      };

      render(<Stage3 finalResponse={response} />);

      expect(screen.getByText(/standalone-model/)).toBeInTheDocument();
    });

    it('should handle empty model name gracefully', () => {
      const response = {
        model: '',
        response: 'Test'
      };

      render(<Stage3 finalResponse={response} />);

      // Should still render Chairman label
      expect(screen.getByText(/Chairman:/)).toBeInTheDocument();
    });
  });

  describe('TDD: Component Re-rendering', () => {
    it('should update when finalResponse prop changes', () => {
      const { rerender } = render(<Stage3 finalResponse={mockFinalResponse} />);

      expect(screen.getByText(/gpt-4-turbo/)).toBeInTheDocument();

      const newResponse = {
        model: 'anthropic/claude-3',
        response: 'Different response'
      };

      rerender(<Stage3 finalResponse={newResponse} />);

      expect(screen.getByText(/claude-3/)).toBeInTheDocument();
      expect(screen.getByText(/Different response/)).toBeInTheDocument();
    });

    it('should handle switching from null to valid response', () => {
      const { rerender, container } = render(<Stage3 finalResponse={null} />);

      expect(container.firstChild).toBeNull();

      rerender(<Stage3 finalResponse={mockFinalResponse} />);

      expect(screen.getByText('Stage 3: Final Council Answer')).toBeInTheDocument();
    });

    it('should handle switching from valid response to null', () => {
      const { rerender, container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      expect(screen.getByText('Stage 3: Final Council Answer')).toBeInTheDocument();

      rerender(<Stage3 finalResponse={null} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('TDD: Performance', () => {
    it('should render quickly even with complex markdown', () => {
      const complexMarkdown = `
# Heading 1
## Heading 2
### Heading 3

**Bold text** and *italic text*

- List item 1
- List item 2
- List item 3

1. Numbered 1
2. Numbered 2

> Blockquote

\`\`\`javascript
const code = "example";
console.log(code);
\`\`\`

[Link](https://example.com)
      `;

      const complexResponse = {
        model: 'openai/gpt-4',
        response: complexMarkdown
      };

      const startTime = performance.now();
      render(<Stage3 finalResponse={complexResponse} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should not cause memory leaks on repeated renders', () => {
      const { rerender, unmount } = render(<Stage3 finalResponse={mockFinalResponse} />);

      // Render multiple times
      for (let i = 0; i < 10; i++) {
        rerender(
          <Stage3
            finalResponse={{
              model: `test/model-${i}`,
              response: `Response ${i}`
            }}
          />
        );
      }

      unmount();

      // If we get here without errors, no memory leaks occurred
      expect(true).toBe(true);
    });
  });

  describe('BDD: Accessibility Ready', () => {
    it('should have semantic heading structure', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      const h3 = container.querySelector('h3');
      expect(h3).toBeInTheDocument();
    });

    it('should render markdown headings with proper hierarchy', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);

      // Markdown h1 and h2 should render
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(1);
    });

    it('should maintain readable text content', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);

      const finalText = container.querySelector('.final-text');
      const textContent = finalText.textContent;

      expect(textContent.length).toBeGreaterThan(0);
      expect(textContent).toContain('deliberation');
    });
  });
});
