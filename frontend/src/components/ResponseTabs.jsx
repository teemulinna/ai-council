/**
 * ResponseTabs - Unified tabbed view for council responses
 * Shows model badges with provider colors, token counts, and costs
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './ResponseTabs.css';

// Provider color mapping
const PROVIDER_COLORS = {
  anthropic: '#D4A574',
  openai: '#10A37F',
  google: '#4285F4',
  deepseek: '#5B6EE1',
  'meta-llama': '#0668E1',
};

// Get provider from model ID
function getProvider(model) {
  if (!model) return 'unknown';
  return model.split('/')[0] || 'unknown';
}

// Get provider color
function getProviderColor(model) {
  const provider = getProvider(model);
  return PROVIDER_COLORS[provider] || '#888888';
}

// Helper to get short model name
function getShortName(model) {
  if (!model) return 'Unknown';
  const name = model.split('/').pop() || model;
  // Further shorten common names
  return name
    .replace('claude-3.5-', '')
    .replace('claude-3-', '')
    .replace('gpt-4o-', 'gpt-4o-')
    .replace('gemini-1.5-', '')
    .replace('-instruct', '');
}

// Format cost nicely
function formatCost(cost) {
  if (!cost || cost === 0) return null;
  if (cost < 0.001) return '<$0.001';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}

// Format token count
function formatTokens(tokens) {
  if (!tokens) return null;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return tokens.toString();
}

// De-anonymize text (replace "Response A" with actual model names)
function deAnonymize(text, labelToModel) {
  if (!labelToModel || !text) return text;
  let result = text;
  Object.entries(labelToModel).forEach(([label, model]) => {
    const shortName = getShortName(model);
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), `**${shortName}**`);
  });
  return result;
}

// Model Badge component
function ModelBadge({ model, tokens, cost, isActive, onClick }) {
  const color = getProviderColor(model);
  const shortName = getShortName(model);
  const provider = getProvider(model);

  return (
    <button
      className={`model-badge ${isActive ? 'model-badge--active' : ''}`}
      onClick={onClick}
      style={{ '--provider-color': color }}
    >
      <span className="model-badge__dot" />
      <span className="model-badge__name">{shortName}</span>
      {tokens?.total > 0 && (
        <span className="model-badge__tokens">{formatTokens(tokens.total)}</span>
      )}
    </button>
  );
}

export default function ResponseTabs({
  stage1,
  stage2,
  stage3,
  metadata,
  loading,
}) {
  const [activeTab, setActiveTab] = useState('final');
  const [selectedModel, setSelectedModel] = useState(0);
  const [selectedRanker, setSelectedRanker] = useState(0);

  const hasFinal = !!stage3;
  const hasIndividual = stage1 && stage1.length > 0;
  const hasRankings = stage2 && stage2.length > 0;

  // Calculate totals
  const individualCount = stage1?.length || 0;
  const totalTokens = stage1?.reduce((sum, r) => sum + (r.tokens?.total || 0), 0) || 0;
  const totalCost = metadata?.cost || stage1?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;

  // Loading state
  if (loading?.stage1 && !hasIndividual && !hasRankings && !hasFinal) {
    return (
      <div className="response-tabs response-tabs--loading">
        <div className="loading-state">
          <div className="spinner" />
          <span>Consulting the council...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="response-tabs">
      {/* Tab Navigation */}
      <div className="tabs-nav" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'final'}
          className={`tab-btn ${activeTab === 'final' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('final')}
          disabled={!hasFinal && !loading?.stage3}
        >
          Final
          {hasFinal && <span className="tab-check">✓</span>}
          {loading?.stage3 && <span className="spinner spinner--small" />}
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'individual'}
          className={`tab-btn ${activeTab === 'individual' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('individual')}
          disabled={!hasIndividual && !loading?.stage1}
        >
          Individual
          {hasIndividual && <span className="tab-count">{individualCount}</span>}
          {loading?.stage1 && <span className="spinner spinner--small" />}
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'rankings'}
          className={`tab-btn ${activeTab === 'rankings' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('rankings')}
          disabled={!hasRankings && !loading?.stage2}
        >
          Rankings
          {loading?.stage2 && <span className="spinner spinner--small" />}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="tabs-content">
        {/* Final Answer Tab */}
        {activeTab === 'final' && (
          <div className="tab-panel" role="tabpanel">
            {loading?.stage3 ? (
              <div className="loading-state">
                <div className="spinner" />
                <span>Synthesizing final answer...</span>
              </div>
            ) : hasFinal ? (
              <div className="final-content">
                <div className="markdown-content">
                  <ReactMarkdown>{stage3.content || stage3.response}</ReactMarkdown>
                </div>
                {stage3.model && (
                  <div className="response-footer">
                    <div className="footer-model">
                      <span
                        className="footer-dot"
                        style={{ background: getProviderColor(stage3.model) }}
                      />
                      <span className="footer-label">Synthesized by</span>
                      <span className="footer-name">{getShortName(stage3.model)}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-panel">
                <p>Waiting for synthesis...</p>
              </div>
            )}
          </div>
        )}

        {/* Individual Responses Tab */}
        {activeTab === 'individual' && (
          <div className="tab-panel" role="tabpanel">
            {loading?.stage1 ? (
              <div className="loading-state">
                <div className="spinner" />
                <span>Collecting responses...</span>
              </div>
            ) : hasIndividual ? (
              <div className="individual-content">
                {/* Model badges */}
                <div className="model-selector">
                  {stage1.map((resp, idx) => (
                    <ModelBadge
                      key={idx}
                      model={resp.model}
                      tokens={resp.tokens}
                      cost={resp.cost}
                      isActive={selectedModel === idx}
                      onClick={() => setSelectedModel(idx)}
                    />
                  ))}
                </div>

                {/* Selected model response */}
                <div className="model-response">
                  {/* Response header with model info */}
                  <div className="model-response__header">
                    <span
                      className="model-response__dot"
                      style={{ background: getProviderColor(stage1[selectedModel].model) }}
                    />
                    <span className="model-response__name">
                      {stage1[selectedModel].model}
                    </span>
                    {stage1[selectedModel].tokens?.total > 0 && (
                      <span className="model-response__stats">
                        {formatTokens(stage1[selectedModel].tokens.total)} tokens
                        {stage1[selectedModel].cost > 0 && (
                          <> · {formatCost(stage1[selectedModel].cost)}</>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="markdown-content">
                    <ReactMarkdown>{stage1[selectedModel].response}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-panel">
                <p>No individual responses yet</p>
              </div>
            )}
          </div>
        )}

        {/* Rankings Tab */}
        {activeTab === 'rankings' && (
          <div className="tab-panel" role="tabpanel">
            {loading?.stage2 ? (
              <div className="loading-state">
                <div className="spinner" />
                <span>Peer evaluation in progress...</span>
              </div>
            ) : hasRankings ? (
              <div className="rankings-content">
                {/* Aggregate rankings summary */}
                {metadata?.aggregate_rankings && metadata.aggregate_rankings.length > 0 && (
                  <div className="aggregate-summary">
                    <h4>Consensus Ranking</h4>
                    <ol className="ranking-list">
                      {metadata.aggregate_rankings.map((item, idx) => (
                        <li key={idx} className="ranking-item">
                          <span className={`rank-position rank-position--${idx + 1}`}>
                            {idx + 1}
                          </span>
                          <span
                            className="rank-dot"
                            style={{ background: getProviderColor(item.model) }}
                          />
                          <span className="rank-model">{getShortName(item.model)}</span>
                          <span className="rank-score">
                            avg: {item.average_rank.toFixed(1)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Individual evaluations */}
                <div className="evaluations">
                  <h4>Individual Evaluations</h4>
                  <div className="evaluator-selector">
                    {stage2.map((rank, idx) => (
                      <ModelBadge
                        key={idx}
                        model={rank.model}
                        isActive={selectedRanker === idx}
                        onClick={() => setSelectedRanker(idx)}
                      />
                    ))}
                  </div>
                  <div className="evaluation-content markdown-content">
                    <ReactMarkdown>
                      {deAnonymize(stage2[selectedRanker].ranking, metadata?.label_to_model)}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-panel">
                <p>No rankings available yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Response metadata footer */}
      {(hasIndividual || hasFinal) && (
        <div className="response-meta">
          <span className="meta-item">
            <strong>{individualCount}</strong> models
          </span>
          {totalTokens > 0 && (
            <>
              <span className="meta-divider">·</span>
              <span className="meta-item">
                <strong>{formatTokens(totalTokens)}</strong> tokens
              </span>
            </>
          )}
          {totalCost > 0 && (
            <>
              <span className="meta-divider">·</span>
              <span className="meta-item meta-item--cost">
                {formatCost(totalCost)}
              </span>
            </>
          )}
          {metadata?.cache_hit && (
            <>
              <span className="meta-divider">·</span>
              <span className="meta-item meta-item--cached">cached</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
