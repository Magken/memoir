import { ThemeScroll } from '../ThemeScroll'

export function ProseContentShowcase() {
  return (
    <div className="space-y-12">
      <p className="type-body-sm type-muted prose-measure">
        Dividers, lists, and tables — theme tokens + typography scale. Apply{' '}
        <code className="type-code">.theme-divider</code>,{' '}
        <code className="type-code">.theme-list</code>, and{' '}
        <code className="type-code">.theme-table</code> under{' '}
        <code className="type-code">.theme</code>; stack <code className="type-code">.type-*</code>{' '}
        on copy inside cells and items.
      </p>

      <section className="space-y-4">
        <p className="type-overline">Horizontal dividers</p>
        <div className="space-y-6 prose-measure">
          <hr className="theme-divider" />
          <hr className="theme-divider theme-divider--strong" />
          <hr className="theme-divider theme-divider--accent" />
          <hr className="theme-divider theme-divider--inset" />
          <div className="theme-divider-row">
            <hr className="theme-divider theme-divider--strong" />
            <span className="theme-divider-row__label type-overline">Section break</span>
            <hr className="theme-divider theme-divider--strong" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Vertical divider</p>
        <div className="theme-card theme-card--flat flex min-h-[5rem] max-w-md items-stretch gap-0 p-4">
          <div className="flex flex-1 flex-col gap-1">
            <p className="type-label">Left panel</p>
            <p className="type-body-sm type-muted">Sidebar or meta column.</p>
          </div>
          <hr className="theme-divider theme-divider--vertical theme-divider--strong" aria-hidden />
          <div className="flex flex-1 flex-col gap-1 pl-4">
            <p className="type-label">Right panel</p>
            <p className="type-body-sm type-muted">Primary content column.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Bullet lists</p>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <p className="type-label">Default</p>
            <ul className="theme-list">
              <li>Semantic type scale with Source Serif 4 display and Source Sans 3 body.</li>
              <li>
                Nested items inherit accent markers
                <ul className="theme-list theme-list--compact">
                  <li>Composable modifiers stack on scale classes.</li>
                  <li>Palette tokens drive muted, accent, and status colors.</li>
                </ul>
              </li>
              <li>Self-hosted Fontsource packages — no runtime CDN.</li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="type-label">Ordered · checked · compact</p>
            <ol className="theme-list theme-list--ordered">
              <li>Define content structure in markdown or JSX.</li>
              <li>Apply <code className="type-code">.theme-list--ordered</code> on <code className="type-code">ol</code>.</li>
              <li>Pair with <code className="type-code">.type-body-sm</code> inside items when needed.</li>
            </ol>
            <ul className="theme-list theme-list--checked theme-list--compact theme-list--muted">
              <li>Typography tab documented</li>
              <li>Theme palette synced to document root</li>
              <li>Cards and forms share border tokens</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Tables</p>
        <ThemeScroll axis="horizontal" rail="mini" className="theme-table-wrap">
          <table className="theme-table">
            <caption>Typography tokens</caption>
            <thead>
              <tr>
                <th scope="col">Token</th>
                <th scope="col">Role</th>
                <th scope="col">Example class</th>
                <th scope="col" className="type-tabular">
                  Size
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="type-mono type-code">display</td>
                <td className="type-body-sm">Hero headlines</td>
                <td>
                  <code className="type-code">.type-display-lg</code>
                </td>
                <td className="type-mono type-tabular">fluid</td>
              </tr>
              <tr>
                <td className="type-mono type-code">heading</td>
                <td className="type-body-sm">Section titles</td>
                <td>
                  <code className="type-code">.type-h2</code>
                </td>
                <td className="type-mono type-tabular">1.6–2.4rem</td>
              </tr>
              <tr>
                <td className="type-mono type-code">body</td>
                <td className="type-body-sm">Paragraph copy</td>
                <td>
                  <code className="type-code">.type-body</code>
                </td>
                <td className="type-mono type-tabular">1rem</td>
              </tr>
              <tr>
                <td className="type-mono type-code">meta</td>
                <td className="type-body-sm">Labels & captions</td>
                <td>
                  <code className="type-code">.type-overline</code>
                </td>
                <td className="type-mono type-tabular">0.6875rem</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>4 rows · striped body · neobrutal frame</td>
              </tr>
            </tfoot>
          </table>
        </ThemeScroll>

        <ThemeScroll axis="horizontal" rail="mini" className="theme-table-wrap theme-table-wrap--plain max-w-md">
          <table className="theme-table theme-table--compact theme-table--plain">
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col" className="type-tabular">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="type-body-sm">Starter</td>
                <td className="type-mono type-tabular">$0</td>
              </tr>
              <tr>
                <td className="type-body-sm">Pro</td>
                <td className="type-mono type-tabular">$24</td>
              </tr>
              <tr>
                <td className="type-body-sm">Team</td>
                <td className="type-mono type-tabular">$79</td>
              </tr>
            </tbody>
          </table>
        </ThemeScroll>
      </section>
    </div>
  )
}
