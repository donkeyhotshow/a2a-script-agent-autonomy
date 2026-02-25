<?php

namespace App\Http\Controllers\Frontend;

use App\AiRudeDepot\Storage\UrlStorage;
use App\Helpers\ArrayHelper;
use App\Helpers\DateHelper;
use App\Helpers\StringHelper;
use App\Helpers\UrlHelper;
use App\Helpers\XmlHelper;
use App\Http\Controllers\Common\Controller;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\URL;

class SitemapController extends Controller
{
    /**
     * @var UrlStorage
     */
    protected $urlStorage;

    /**
     * Create a new SitemapController instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->urlStorage = new UrlStorage('ai/permalinks');
    }

    /**
     * Generate a sitemap XML file.
     *
     * @return Response
     */
    public function index()
    {
        // Get all permalinks from storage
        $allPermalinks = $this->urlStorage->getAllPermalinks();

        // Create XML content
        $xml = $this->generateSitemapXml($allPermalinks);

        // Create response with proper content type
        return response($xml)
            ->header('Content-Type', 'text/xml');
    }

    /**
     * Generate sitemap XML content from permalinks.
     *
     * @param array $modules Modules with their permalinks
     * @return string XML content
     */
    protected function generateSitemapXml($modules)
    {
        // Generate XML header
        $xml = XmlHelper::createHeader();
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . PHP_EOL;

        // Process each module
        foreach ($modules as $module => $permalinks) {
            foreach ($permalinks as $permalink) {
                // Skip inactive permalinks
                if (ArrayHelper::get($permalink, 'is_active', true) === false) {
                    continue;
                }

                $url = $this->generateUrl($module, $permalink);
                $lastmod = ArrayHelper::get($permalink, 'updated_at') ? DateHelper::formatIso8601(strtotime($permalink['updated_at'])) : null;
                $changefreq = $this->getChangeFrequency($module, $permalink);
                $priority = $this->getPriority($module, $permalink);

                $xml .= '  <url>' . PHP_EOL;
                $xml .= '    <loc>' . StringHelper::escapeXml($url) . '</loc>' . PHP_EOL;

                if ($lastmod) {
                    $xml .= '    <lastmod>' . $lastmod . '</lastmod>' . PHP_EOL;
                }

                $xml .= '    <changefreq>' . $changefreq . '</changefreq>' . PHP_EOL;
                $xml .= '    <priority>' . $priority . '</priority>' . PHP_EOL;
                $xml .= '  </url>' . PHP_EOL;
            }
        }

        // Close XML
        $xml .= '</urlset>';

        return $xml;
    }

    /**
     * Generate URL for a permalink.
     *
     * @param string $module
     * @param array $permalink
     * @return string
     */
    protected function generateUrl($module, $permalink)
    {
        $slug = ArrayHelper::get($permalink, 'slug', '');
        return UrlHelper::build([$module, $slug]);
    }

    /**
     * Get change frequency for a permalink.
     *
     * @param string $module
     * @param array $permalink
     * @return string
     */
    protected function getChangeFrequency($module, $permalink)
    {
        // Set default change frequency based on module
        switch ($module) {
            case 'blog':
                return 'weekly';
            case 'product':
                return 'daily';
            case 'page':
                return 'monthly';
            default:
                return 'weekly';
        }
    }

    /**
     * Get priority for a permalink.
     *
     * @param string $module
     * @param array $permalink
     * @return string
     */
    protected function getPriority($module, $permalink)
    {
        // Set default priority based on module
        switch ($module) {
            case 'page':
                return '1.0';
            case 'blog':
                return '0.8';
            case 'product':
                return '0.9';
            default:
                return '0.7';
        }
    }

    /**
     * Generate a XML sitemap for a specific module.
     *
     * @param string $module
     * @return Response
     */
    public function module($module)
    {
        // Validate module
        if (!in_array($module, ['page', 'blog', 'product', 'custom'])) {
            abort(404);
        }

        // Get permalinks for the specified module
        $permalinks = $this->urlStorage->getModulePermalinks($module);

        // Create XML content
        $xml = $this->generateSitemapXml([$module => $permalinks]);

        // Create response with proper content type
        return response($xml)
            ->header('Content-Type', 'text/xml');
    }

    /**
     * Generate a sitemap index XML file.
     *
     * @return Response
     */
    public function sitemapIndex()
    {
        $modules = ['page', 'blog', 'product', 'custom'];

        // Generate XML header
        $xml = XmlHelper::createHeader();
        $xml .= '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . PHP_EOL;

        // Add sitemap for each module
        foreach ($modules as $module) {
            $permalinks = $this->urlStorage->getModulePermalinks($module);

            // Only include module if it has permalinks
            if (count($permalinks) > 0) {
                $lastmod = $this->getLastModifiedDate($permalinks);
                $url = UrlHelper::build(['sitemap-' . $module . '.xml']);

                $xml .= '  <sitemap>' . PHP_EOL;
                $xml .= '    <loc>' . StringHelper::escapeXml($url) . '</loc>' . PHP_EOL;

                if ($lastmod) {
                    $xml .= '    <lastmod>' . $lastmod . '</lastmod>' . PHP_EOL;
                }

                $xml .= '  </sitemap>' . PHP_EOL;
            }
        }

        // Close XML
        $xml .= '</sitemapindex>';

        // Create response with proper content type
        return response($xml)
            ->header('Content-Type', 'text/xml');
    }

    /**
     * Get the latest modification date from a set of permalinks.
     *
     * @param array $permalinks
     * @return string|null
     */
    protected function getLastModifiedDate($permalinks)
    {
        $lastmod = null;

        foreach ($permalinks as $permalink) {
            if ($date = ArrayHelper::get($permalink, 'updated_at')) {
                $timestamp = strtotime($date);

                if (!$lastmod || $timestamp > strtotime($lastmod)) {
                    $lastmod = DateHelper::formatIso8601($timestamp);
                }
            }
        }

        return $lastmod;
    }
}


