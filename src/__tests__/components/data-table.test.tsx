import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataTable, type Column } from '@/components/shared/data-table'
import { I18nProvider } from '@/lib/i18n/i18n-context'

// Wrap DataTable with required providers
function renderDataTable(props: React.ComponentProps<typeof DataTable>) {
  return render(
    <I18nProvider>
      <DataTable {...props} />
    </I18nProvider>,
  )
}

const sampleColumns: Column[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
]

const sampleData = [
  { name: 'Ahmed', email: 'ahmed@test.com', role: 'Admin' },
  { name: 'Fatima', email: 'fatima@test.com', role: 'Rep' },
  { name: 'Khaled', email: 'khaled@test.com', role: 'Manager' },
]

describe('DataTable', () => {
  it('renders column headers', () => {
    renderDataTable({ columns: sampleColumns, data: sampleData })
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Role')).toBeInTheDocument()
  })

  it('renders data rows', () => {
    renderDataTable({ columns: sampleColumns, data: sampleData })
    expect(screen.getByText('Ahmed')).toBeInTheDocument()
    expect(screen.getByText('ahmed@test.com')).toBeInTheDocument()
    expect(screen.getByText('Fatima')).toBeInTheDocument()
    expect(screen.getByText('Khaled')).toBeInTheDocument()
  })

  it('shows empty message when no data', () => {
    renderDataTable({
      columns: sampleColumns,
      data: [],
      emptyMessage: 'No users found.',
    })
    expect(screen.getByText('No users found.')).toBeInTheDocument()
  })

  it('shows default empty message', () => {
    renderDataTable({ columns: sampleColumns, data: [] })
    expect(screen.getByText('No records found.')).toBeInTheDocument()
  })

  it('renders custom cell content via render function', () => {
    const columnsWithRender: Column[] = [
      {
        key: 'name',
        label: 'Name',
        render: (value: string) => <strong data-testid="bold-name">{value}</strong>,
      },
    ]
    renderDataTable({
      columns: columnsWithRender,
      data: [{ name: 'Ahmed' }],
    })
    expect(screen.getByTestId('bold-name')).toHaveTextContent('Ahmed')
  })

  it('handles pagination with correct page info', () => {
    // Create 15 items to trigger pagination (default page size is 10)
    const manyItems = Array.from({ length: 15 }, (_, i) => ({
      name: `User ${i + 1}`,
      email: `user${i + 1}@test.com`,
      role: 'Rep',
    }))

    renderDataTable({
      columns: sampleColumns,
      data: manyItems,
      pagination: true,
    })

    // Should show page info: 1 / 2
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    // First 10 items should be visible
    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.getByText('User 10')).toBeInTheDocument()
    // 11th item should not be visible on page 1
    expect(screen.queryByText('User 11')).not.toBeInTheDocument()
  })

  it('does not show pagination when disabled', () => {
    renderDataTable({
      columns: sampleColumns,
      data: sampleData,
      pagination: false,
    })
    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument()
  })

  it('shows loading skeleton when isLoading is true', () => {
    const { container } = renderDataTable({
      columns: sampleColumns,
      data: [],
      isLoading: true,
    })
    // Should render animated pulse skeleton cells
    const pulseElements = container.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })
})
