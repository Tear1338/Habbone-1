import ImagerClient from '@/components/imager/ImagerClient'

export const revalidate = 3600

export default function ImagerPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-10">
      <ImagerClient />
    </main>
  )
}
