# Advanced Key Contact Discovery

This document outlines the implementation of the "Advanced Key Contact Discovery" search strategy, designed to optimize the discovery of high-quality decision makers within companies.

## Overview

The Advanced Key Contact Discovery strategy is a sophisticated search approach that prioritizes finding leadership-level contacts within companies, with a focus on high-quality validation and verification. It builds upon the baseline "Small Business Contacts" strategy but adds several enhancements for improved accuracy and contact quality.

## Core Strategy Components

### 1. Module Sequence

The strategy follows a four-stage sequential process:

1. **Company Overview** - Enhanced company analysis with leadership focus
2. **Decision Maker** - Advanced name validation with role-based verification
3. **Email Discovery** - Multi-method email detection with cross-reference validation
4. **Email Deepdive** - Additional verification for leadership contacts

### 2. Advanced Validation Rules

- **Name Validation**:
  - Minimum score threshold: 80
  - Business term penalty: 25
  - Required full names (filtering out generic names)
  - Role validation (prioritizing leadership positions)

- **Email Validation**:
  - Minimum score threshold: 75
  - Pattern score requirement: 0.7
  - Business domain score requirement: 0.8
  - Placeholder detection for filtering low-quality results

### 3. Leadership Role Prioritization

The strategy uses role-based multipliers to emphasize leadership positions:
- Founder/Owner multiplier: 2.0x
- C-level executive multiplier: 1.8x
- Director-level multiplier: 1.5x

These multipliers affect the confidence scores during contact validation.

## Key Subsearches

The strategy employs specialized subsearches to improve quality:

1. **Leadership Role Validation** - Analyzes job titles and verifies leadership positions
2. **Enhanced Name Validation** - Ensures discovered names are genuine and properly formatted
3. **Domain Analysis Search** - Validates that email domains match company information
4. **Enhanced Pattern Prediction** - Uses sophisticated pattern matching for email generation

## Performance Enhancement

The scoring calculation for this strategy prioritizes contact quality by applying these weights:
- Contact quality: 50% of overall score
- Company quality: 25% of overall score
- Email quality: 25% of overall score

This weighting reflects the importance of finding the right decision-maker, while still ensuring company and email data accuracy.

## Comparison to Other Strategies

Strategy | Strengths | Focus
--- | --- | ---
Advanced Key Contact Discovery | High-quality leadership contacts with enhanced validation | Decision makers with reliable contact information
Small Business Contacts | Simpler validation with good performance on smaller businesses | Basic contact discovery for small companies
Enhanced Contact Discovery | Improved email validation but less focus on leadership roles | General contact discovery with better email verification

## Implementation Notes

This strategy requires all four core modules to function properly:
- Company Overview
- Decision Maker
- Email Discovery
- Email Deepdive

The strategy's configuration includes detailed validation rules and search options across all modules, with particular emphasis on role validation and leadership identification.