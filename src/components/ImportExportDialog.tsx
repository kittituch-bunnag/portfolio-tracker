import { useRef, useState } from 'react'
import { Download, Upload, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePortfolioStore } from '@/store/portfolioStore'
import { exportToJson, flattenExport, parseImportFile, PortfolioExport } from '@/utils/dataIO'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportMode = 'merge' | 'replace'

export function ImportExportDialog({ open, onOpenChange }: Props) {
  const { assets, importAssets } = usePortfolioStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PortfolioExport | null>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const pendingFlat = pending ? flattenExport(pending) : []
  const duplicateCount = pendingFlat.filter((a) => assets.some((e) => e.id === a.id)).length

  function handleExport() {
    exportToJson(assets)
    setSuccess(`Exported ${assets.length} asset${assets.length !== 1 ? 's' : ''} to JSON.`)
    setError(null)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setSuccess(null)
    setPending(null)
    try {
      const data = await parseImportFile(file)
      setPending(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      // Reset so the same file can be re-selected
      e.target.value = ''
    }
  }

  function handleConfirmImport() {
    if (!pending) return
    setImporting(true)
    importAssets(pendingFlat, mode)
    const added =
      mode === 'replace'
        ? pendingFlat.length
        : pendingFlat.filter((a) => !assets.some((e) => e.id === a.id)).length
    setSuccess(
      mode === 'replace'
        ? `Replaced all assets with ${added} from file.`
        : `Merged ${added} new asset${added !== 1 ? 's' : ''} (skipped duplicates).`
    )
    setPending(null)
    setImporting(false)
  }

  function handleClose(v: boolean) {
    if (!v) {
      setPending(null)
      setError(null)
      setSuccess(null)
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import / Export Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Export section */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Export</h3>
            <p className="text-xs text-muted-foreground">
              Download all {assets.length} asset{assets.length !== 1 ? 's' : ''} as a JSON file you
              can back up or import later.
            </p>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={assets.length === 0}>
              <Download className="h-4 w-4 mr-1.5" />
              Download portfolio.json
            </Button>
          </section>

          <hr className="border-border" />

          {/* Import section */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Import</h3>
            <p className="text-xs text-muted-foreground">
              Load assets from a previously exported JSON file.
            </p>

            {/* File picker */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileJson className="h-4 w-4 mr-1.5" />
                Choose JSON file…
              </Button>
            </div>

            {/* Pending preview */}
            {pending && (
              <div className="rounded-md border bg-muted/40 p-3 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileJson className="h-4 w-4 shrink-0" />
                  <span>
                    <strong className="text-foreground">{pendingFlat.length}</strong> asset
                    {pendingFlat.length !== 1 ? 's' : ''} across{' '}
                    <strong className="text-foreground">
                      {Object.keys(pending.assets).length}
                    </strong>{' '}
                    categor{Object.keys(pending.assets).length !== 1 ? 'ies' : 'y'}
                    {duplicateCount > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {' '}({duplicateCount} duplicate ID{duplicateCount !== 1 ? 's' : ''})
                      </span>
                    )}
                  </span>
                </div>

                {/* Mode toggle */}
                <div className="flex rounded-md border overflow-hidden text-xs w-fit">
                  {(['merge', 'replace'] as ImportMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={cn(
                        'px-3 py-1.5 capitalize transition-colors',
                        mode === m
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'hover:bg-muted text-muted-foreground'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mode === 'merge'
                    ? 'Add new assets only — existing assets with the same ID are kept unchanged.'
                    : 'Replace ALL current assets with the file contents. This cannot be undone.'}
                </p>

                <Button
                  size="sm"
                  variant={mode === 'replace' ? 'destructive' : 'default'}
                  onClick={handleConfirmImport}
                  disabled={importing}
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  {mode === 'replace' ? 'Replace & Import' : 'Merge & Import'}
                </Button>
              </div>
            )}

            {/* Feedback */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
