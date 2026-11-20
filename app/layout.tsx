import type { ReactNode } from 'react'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata = {
    title: {
        default: 'NextraDocs NestJS',
        template: '%s | NextraDocs NestJS'
    },
    description: 'NestJS Technical Documentation'
}

const navbar = (
    <Navbar
        logo={<b>NextraDocs NestJS</b>}
    />
)

const footer = (
    <Footer>
        MIT {new Date().getFullYear()} © NextraDocs NestJS.
    </Footer>
)

type RootLayoutProps = {
    children: ReactNode
}

export default async function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="ko" dir="ltr" suppressHydrationWarning>
            <Head />

            <body>
                <Layout
                    navbar={navbar}
                    pageMap={await getPageMap()}
                    footer={footer}
                >
                    {children}
                </Layout>
            </body>
        </html>
    )
}
