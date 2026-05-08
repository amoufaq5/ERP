import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PageHeader from '@/components/shared/page-header'

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Dashboard" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<PageHeader title="Dashboard" description="Welcome to the dashboard" />)
    expect(screen.getByText('Welcome to the dashboard')).toBeInTheDocument()
  })

  it('does not render description paragraph when not provided', () => {
    const { container } = render(<PageHeader title="Dashboard" />)
    const description = container.querySelector('p')
    expect(description).toBeNull()
  })

  it('renders actions slot', () => {
    render(
      <PageHeader
        title="Dashboard"
        actions={<button>Add New</button>}
      />,
    )
    expect(screen.getByText('Add New')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(
      <PageHeader
        title="Dashboard"
        icon={<span data-testid="icon">ICON</span>}
      />,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('handles missing optional props gracefully', () => {
    const { container } = render(<PageHeader title="Minimal" />)
    expect(screen.getByText('Minimal')).toBeInTheDocument()
    // No description paragraph
    expect(container.querySelector('p')).toBeNull()
  })

  it('applies custom className', () => {
    const { container } = render(
      <PageHeader title="Test" className="custom-class" />,
    )
    expect(container.firstElementChild).toHaveClass('custom-class')
  })

  it('renders children as fallback for actions (deprecated prop)', () => {
    render(
      <PageHeader title="Dashboard">
        <button>Legacy Button</button>
      </PageHeader>,
    )
    expect(screen.getByText('Legacy Button')).toBeInTheDocument()
  })
})
