import useSWR from 'swr'
import useUiStore from '../../store/useUiStore'
import useFilesData from '../../hooks/graph/useFilesData'
import BreadcrumbNav from './BreadcrumbNav'
import CommonList from '../../components/CommonList/CommonList'
import Loading from '../Loading'
import { remoteItemToFile, pathConvert } from '../../utils'
import { FileItem, RemoteItem } from '../../types/file'
import Grid from '@mui/material/Unstable_Grid2/Grid2'
import FilterMenu from './FilterMenu'
import PictureView from '../PictureView/PictureView'
import { Divider } from '@mui/material'
import { useState } from 'react'
import useUser from '@/hooks/graph/useUser'
import { useNavigate } from 'react-router-dom'
import usePictureStore from '@/store/usePictureStore'
import usePlayQueueStore from '@/store/usePlayQueueStore'
import usePlayerStore from '@/store/usePlayerStore'

const Files = () => {

  const [
    shuffle,
    folderTree,
    display,
    sortBy,
    orderBy,
    foldersFirst,
    mediaOnly,
    updateFolderTree,
    updateVideoViewIsShow,
    updateShuffle,
  ] = useUiStore(
    (state) => [
      state.shuffle,
      state.folderTree,
      state.display,
      state.sortBy,
      state.orderBy,
      state.foldersFirst,
      state.mediaOnly,
      state.updateFolderTree,
      state.updateVideoViewIsShow,
      state.updateShuffle,
    ]
  )

  const [updatePictureList, updateCurrentPicture] = usePictureStore(state => [state.updatePictureList, state.updateCurrentPicture,])
  const [updatePlayQueue, updateCurrentIndex] = usePlayQueueStore((state) => [state.updatePlayQueue, state.updateCurrentIndex])
  const [updatePlayStatu] = usePlayerStore(state => [state.updatePlayStatu])

  const { getFilesData } = useFilesData()
  const navigate = useNavigate()

  const { account } = useUser()

  const path = pathConvert(folderTree)

  const fileListFetcher = async (path: string) => {
    const res: RemoteItem[] = await getFilesData(account, path)
    return remoteItemToFile(res)
  }

  const { data: fileListData, error: fileListError, isLoading: fileListIsLoading } =
    useSWR(
      `${account.username}/${path}`,
      () => fileListFetcher(path),
      { revalidateOnFocus: false }
    )

  const filteredFileList = fileListData?.filter((item) => mediaOnly ? item.fileType !== 'other' : true)

  const sortedFileList = filteredFileList?.sort((a, b) => {
    if (foldersFirst) {
      if (a.fileType === 'folder' && b.fileType !== 'folder') {
        return -1
      } else if (a.fileType !== 'folder' && b.fileType === 'folder') {
        return 1
      }
    }

    if (sortBy === 'name') {
      if (orderBy === 'asc') {
        return (a.fileName).localeCompare(b.fileName)
      } else {
        return (b.fileName).localeCompare(a.fileName)
      }
    } else if (sortBy === 'size') {
      if (orderBy === 'asc') {
        return a.fileSize - b.fileSize
      } else {
        return b.fileSize - a.fileSize
      }
    } else if (sortBy === 'datetime' && a.lastModifiedDateTime && b.lastModifiedDateTime) {
      if (orderBy === 'asc') {
        return new Date(a.lastModifiedDateTime).getTime() - new Date(b.lastModifiedDateTime).getTime()
      } else {
        return new Date(b.lastModifiedDateTime).getTime() - new Date(a.lastModifiedDateTime).getTime()
      }
    } else return 0
  })

  const [scrollPath, setScrollPath] = useState<FileItem['filePath'] | undefined>()
  const scrollIndex = scrollPath ? sortedFileList?.findIndex(item => pathConvert(item.filePath) === pathConvert(scrollPath)) : undefined

  const handleClickNav = (index: number) => {
    if (index < folderTree.length - 1) {
      setScrollPath(folderTree.slice(0, index + 2))
      updateFolderTree(folderTree.slice(0, index + 1))
    }
  }

  const open = (index: number) => {
    const listData = sortedFileList
    if (listData) {
      const currentFile = listData[index]

      if (currentFile && currentFile.fileType === 'folder') {
        updateFolderTree(currentFile.filePath)
        navigate('/')
      }

      if (currentFile && currentFile.fileType === 'picture') {
        const list = listData.filter(item => item.fileType === 'picture')
        updatePictureList(list)
        updateCurrentPicture(currentFile)
      }

      if (currentFile && (currentFile.fileType === 'audio' || currentFile.fileType === 'video')) {
        const list = listData
          .filter((item) => item.fileType === 'audio' || item.fileType === 'video')
          .map((item, _index) => ({ ...item, index: _index }))
        if (shuffle) {
          updateShuffle(false)
        }
        updatePlayQueue(list)
        updateCurrentIndex(list.find(item => pathConvert(item.filePath) === pathConvert(currentFile.filePath))?.index || 0)
        updatePlayStatu('playing')
        if (currentFile.fileType === 'video') {
          updateVideoViewIsShow(true)
        }
      }
    }
  }

  return (
    <Grid container
      sx={{
        height: '100%',
        overflow: 'auto',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        flexWrap: 'nowrap',
      }}>
      <Grid container
        xs={12}
        justifyContent='space-between'
        alignItems='center'
        wrap='nowrap'
        padding='0.125rem'
        gap='0.25rem'
      >
        <Grid xs>
          <BreadcrumbNav handleClickNav={handleClickNav} />
        </Grid>
        <Grid xs={'auto'} sx={{ display: 'flex', flexDirection: 'row', justifyItems: 'center', alignItems: 'center' }}>
          <FilterMenu />
        </Grid>
      </Grid>
      <Divider />
      <Grid xs={12} sx={{ flexGrow: 1, overflow: 'auto' }}>
        {
          (fileListIsLoading || !fileListData || !sortedFileList || fileListError)
            ? <Loading />
            : <CommonList
              display={display}
              listData={sortedFileList}
              listType='files'
              scrollIndex={scrollIndex}
              func={{ open }}
            />
        }
      </Grid>
      <PictureView />
    </Grid>
  )
}

export default Files